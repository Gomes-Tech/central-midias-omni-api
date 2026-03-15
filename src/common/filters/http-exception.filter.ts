import {
  CircuitBreakerOpenException,
  TimeoutError,
} from '@infrastructure/circuit-breaker';
import { LoggerService } from '@infrastructure/log';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { REQUEST_ID_KEY } from '../interceptors';
import { TokenExpiredException } from './token-expired.exception';

type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string[] | string;
};

@Catch(HttpException, CircuitBreakerOpenException, TimeoutError)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly loggerService: LoggerService) {}

  /**
   * Lista de campos sensíveis que devem ser sanitizados
   */
  private readonly sensitiveFields = [
    'password',
    'token',
    'apikey',
    'secret',
    'authorization',
    'cookie',
    'accesstoken',
    'access_token',
    'refreshtoken',
    'refresh_token',
    'jwt',
    'jwt_secret',
    'session',
    'sessionid',
    'session_id',
    'csrf',
    'csrf_token',
    'privatekey',
    'private_key',
    'publickey',
    'public_key',
    'credential',
    'credentials',
  ];

  catch(
    exception: HttpException | CircuitBreakerOpenException | TimeoutError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Tratar exceções específicas do circuit breaker
    if (exception instanceof CircuitBreakerOpenException) {
      const retryAfter = Math.ceil(exception.retryAfter / 1000);
      response.setHeader('Retry-After', retryAfter.toString());
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        timestamp: new Date().toISOString(),
        path: request.url,
        message:
          'Serviço temporariamente indisponível. Tente novamente mais tarde.',
        retryAfter,
      });
      const requestId = (request as any)[REQUEST_ID_KEY];
      const userId = (request as any).user?.id;
      this.logger.warn(
        `Circuit breaker OPEN for ${exception.key}. Retry after ${retryAfter}s`,
        { requestId },
      );
      void this.loggerService.warn(
        `Circuit breaker OPEN for ${exception.key}. Retry after ${retryAfter}s`,
        { requestId, path: request.url, method: request.method, userId },
      );
      return;
    }

    if (exception instanceof TimeoutError) {
      response.status(HttpStatus.REQUEST_TIMEOUT).json({
        statusCode: HttpStatus.REQUEST_TIMEOUT,
        timestamp: new Date().toISOString(),
        path: request.url,
        message: 'A operação excedeu o tempo limite. Tente novamente.',
      });
      const requestId = (request as any)[REQUEST_ID_KEY];
      const userId = (request as any).user?.id;
      this.logger.warn(`Timeout error for circuit breaker ${exception.key}`, {
        requestId,
      });
      void this.loggerService.warn(
        `Timeout error for circuit breaker ${exception.key}`,
        { requestId, path: request.url, method: request.method, userId },
      );
      return;
    }

    // Tratar HttpException normalmente
    const status = exception.getStatus() || HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse: ErrorResponse =
      exception.getResponse() as ErrorResponse;

    const message = Array.isArray(errorResponse.message)
      ? errorResponse.message.join(', ')
      : errorResponse.message || exception.message || 'Internal server error';

    // Sanitizar dados sensíveis do request para logging
    const sanitizedRequest = this.sanitizeRequest(request);

    // Obtém o Request ID e User ID se disponíveis
    const requestId = (request as any)[REQUEST_ID_KEY];
    const userId = (request as any).user?.id;

    // Log apenas em desenvolvimento ou com dados sanitizados
    if (process.env.NODE_ENV === 'dev') {
      this.logger.debug('HTTP Exception', {
        requestId,
        userId,
        statusCode: status,
        path: request.url,
        method: request.method,
        message,
        request: sanitizedRequest,
      });
    } else {
      // Em produção, log apenas informações essenciais
      this.logger.warn('HTTP Exception', {
        requestId,
        userId,
        statusCode: status,
        path: request.url,
        method: request.method,
        message,
      });
    }

    // Garantir que a mensagem de erro não contenha dados sensíveis
    const sanitizedMessage = this.sanitizeMessage(message);

    // Persistir na tabela de logs (produção): ERROR para 5xx, WARNING para 4xx
    const logContext = {
      requestId,
      userId,
      path: request.url,
      method: request.method,
      statusCode: status,
      message: sanitizedMessage,
    };
    if (status >= 500) {
      void this.loggerService.error(
        `HTTP ${status}: ${sanitizedMessage}`,
        logContext,
      );
    } else {
      void this.loggerService.warn(
        `HTTP ${status}: ${sanitizedMessage}`,
        logContext,
      );
    }

    // Adiciona header para indicar que o token expirou e o frontend deve fazer refresh
    if (exception instanceof TokenExpiredException) {
      response.setHeader('X-Token-Expired', 'true');
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: sanitizedMessage,
    });
  }

  /**
   * Sanitiza o objeto Request removendo dados sensíveis
   */
  private sanitizeRequest(request: Request): Record<string, any> {
    return {
      method: request.method,
      url: request.url,
      headers: this.sanitizeObject(request.headers || {}),
      body: this.sanitizeObject(request.body || {}),
      query: this.sanitizeObject(request.query || {}),
      params: request.params || {},
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };
  }

  /**
   * Sanitiza um objeto recursivamente, removendo ou mascarando campos sensíveis
   */
  private sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    // Se for array, sanitizar cada item
    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item));
    }

    const sanitized: any = {};

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = this.sensitiveFields.some((field) =>
          lowerKey.includes(field.toLowerCase()),
        );

        if (isSensitive) {
          // Mascarar dados sensíveis
          const value = obj[key];
          if (typeof value === 'string' && value.length > 0) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = '[REDACTED]';
          }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recursivamente sanitizar objetos aninhados
          sanitized[key] = this.sanitizeObject(obj[key]);
        } else {
          sanitized[key] = obj[key];
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitiza a mensagem de erro para garantir que não contenha dados sensíveis
   * Preserva mensagens de erro legítimas que apenas mencionam termos sensíveis,
   * mas sanitiza quando há dados sensíveis reais sendo expostos
   */
  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return message;
    }

    // Padrões que indicam dados sensíveis reais (não apenas menções)
    const sensitivePatterns = [
      // JWT tokens (começam com eyJ)
      /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
      // Tokens longos (mais de 20 caracteres alfanuméricos)
      /\b[a-zA-Z0-9]{30,}\b/,
      // Padrões de senha/token com valor (ex: "password: abc123" ou "token=xyz")
      /\b(password|token|secret|authorization|jwt)\s*[:=]\s*['"]?[^\s'"]{10,}['"]?/i,
      // Emails com senhas (ex: "password: senha123")
      /\b(password|senha)\s*[:=]\s*['"]?[^\s'"]{6,}['"]?/i,
    ];

    // Verificar se há dados sensíveis reais sendo expostos
    const containsSensitiveData = sensitivePatterns.some((pattern) =>
      pattern.test(message),
    );

    if (containsSensitiveData) {
      // Se contiver dados sensíveis reais, retornar mensagem genérica
      return 'Ocorreu um erro ao processar a requisição';
    }

    // Mensagens que apenas mencionam termos sensíveis são preservadas
    // Exemplos válidos: "Token inválido", "Authentication required", "Token foi revogado"
    return message;
  }
}
