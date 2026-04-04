import {
  CircuitBreakerOpenException,
  TimeoutError,
} from '@infrastructure/circuit-breaker';
import { LoggerService } from '@infrastructure/log';
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_KEY } from '../interceptors';
import { HttpExceptionFilter } from './http-exception.filter';
import { TokenExpiredException } from './token-expired.exception';

function createMockResponse() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return {
    status,
    setHeader: jest.fn(),
    json,
  };
}

function createHost(
  request: Partial<Request> & Record<string, unknown>,
  response: ReturnType<typeof createMockResponse>,
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getRequest: () => request as Request,
      getResponse: () => response as unknown as Response,
    }),
  } as ArgumentsHost;
}

function baseRequest(): Partial<Request> & Record<string, unknown> {
  return {
    url: '/v1/users',
    method: 'POST',
    body: {},
    headers: {},
    query: {},
    params: {},
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest'),
    [REQUEST_ID_KEY]: 'req-1',
    user: { id: 'user-1' },
  };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let loggerService: { error: jest.Mock; warn: jest.Mock };
  let debugSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerService = { error: jest.fn(), warn: jest.fn() };
    filter = new HttpExceptionFilter(loggerService as unknown as LoggerService);
    debugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CircuitBreakerOpenException', () => {
    it('deve responder 503 com Retry-After e registrar warn estruturado', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const exception = new CircuitBreakerOpenException('svc-a', 5500);

      filter.catch(exception, createHost(request, response));

      expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '6');
      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          path: request.url,
          message:
            'Serviço temporariamente indisponível. Tente novamente mais tarde.',
          retryAfter: 6,
        }),
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN for svc-a'),
        expect.objectContaining({
          requestId: 'req-1',
          path: request.url,
          method: request.method,
          userId: 'user-1',
        }),
      );
      expect(warnSpy).toHaveBeenCalled();
      expect(loggerService.error).not.toHaveBeenCalled();
    });
  });

  describe('TimeoutError', () => {
    it('deve responder 408 e registrar warn', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const exception = new TimeoutError('timeout', 'svc-b');

      filter.catch(exception, createHost(request, response));

      expect(response.status).toHaveBeenCalledWith(HttpStatus.REQUEST_TIMEOUT);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          path: request.url,
          message: 'A operação excedeu o tempo limite. Tente novamente.',
        }),
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Timeout error for circuit breaker svc-b'),
        expect.objectContaining({ requestId: 'req-1' }),
      );
    });
  });

  describe('HttpException', () => {
    it('deve serializar mensagem em array e usar loggerService.warn em 4xx', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        filter.catch(
          new BadRequestException(['campo a', 'campo b']),
          createHost(request, response),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }

      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'campo a, campo b',
        }),
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.stringMatching(/^HTTP 400:/),
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'campo a, campo b',
        }),
      );
      expect(loggerService.error).not.toHaveBeenCalled();
    });

    it('deve usar loggerService.error em 5xx', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        filter.catch(
          new HttpException('Falha interna', HttpStatus.INTERNAL_SERVER_ERROR),
          createHost(request, response),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }

      expect(response.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(loggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('HTTP 500'),
        expect.objectContaining({ statusCode: 500 }),
      );
    });

    it('deve definir X-Token-Expired para TokenExpiredException', () => {
      const response = createMockResponse();
      const request = baseRequest();

      filter.catch(new TokenExpiredException(), createHost(request, response));

      expect(response.setHeader).toHaveBeenCalledWith(
        'X-Token-Expired',
        'true',
      );
      expect(response.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    });

    it('deve substituir mensagem quando detectar padrão sensível (JWT)', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const jwtLike =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturepart';

      filter.catch(
        new BadRequestException(`Erro ${jwtLike}`),
        createHost(request, response),
      );

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Ocorreu um erro ao processar a requisição',
        }),
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          message: 'Ocorreu um erro ao processar a requisição',
        }),
      );
    });

    it('deve preservar mensagem legítima que só menciona token', () => {
      const response = createMockResponse();
      const request = baseRequest();

      filter.catch(
        new UnauthorizedException('Token inválido'),
        createHost(request, response),
      );

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Token inválido',
        }),
      );
    });

    it('em NODE_ENV dev deve logar debug com body sanitizado', () => {
      const response = createMockResponse();
      const request = baseRequest();
      request.body = { password: 'segredo', name: 'ok' };
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'dev';

      try {
        filter.catch(
          new BadRequestException('x'),
          createHost(request, response),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }

      expect(debugSpy).toHaveBeenCalledWith(
        'HTTP Exception',
        expect.objectContaining({
          request: expect.objectContaining({
            body: expect.objectContaining({
              password: '[REDACTED]',
              name: 'ok',
            }),
          }),
        }),
      );
    });

    it('em dev deve sanitizar arrays e campos aninhados no body', () => {
      const response = createMockResponse();
      const request = baseRequest();
      request.body = [
        { nested: { authorization: 'tok' } },
        'plain',
      ] as never;
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'dev';

      try {
        filter.catch(
          new BadRequestException('err'),
          createHost(request, response),
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }

      expect(debugSpy).toHaveBeenCalledWith(
        'HTTP Exception',
        expect.objectContaining({
          request: expect.objectContaining({
            body: expect.arrayContaining([
              expect.objectContaining({
                nested: expect.objectContaining({
                  authorization: '[REDACTED]',
                }),
              }),
              'plain',
            ]),
          }),
        }),
      );
    });

    it('deve preservar sanitizeMessage quando o tipo não for string', () => {
      const response = createMockResponse();
      const request = baseRequest();
      const ex = new HttpException(
        { message: 404 as unknown as string, statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(ex, createHost(request, response));

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 404,
        }),
      );
    });
  });
});
