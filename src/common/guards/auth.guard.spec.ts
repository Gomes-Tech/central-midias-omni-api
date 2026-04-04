import { UnauthorizedException } from '@common/filters';
import {
  SecurityLoggerService,
  TokenBlacklistService,
} from '@infrastructure/security';
import { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthGuard } from './auth.guard';

function createExecutionContext(request: Partial<Request>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const originalSecret = process.env.SERVER_AUTH_SECRET;

  let guard: AuthGuard;
  let jwtService: jest.Mocked<Pick<JwtService, 'verifyAsync'>>;
  let reflector: { getAllAndOverride: jest.Mock };
  let securityLogger: jest.Mocked<
    Pick<SecurityLoggerService, 'logUnauthorizedAccess' | 'logInvalidToken'>
  >;
  let tokenBlacklist: jest.Mocked<
    Pick<TokenBlacklistService, 'isTokenBlacklisted'>
  >;

  beforeEach(() => {
    process.env.SERVER_AUTH_SECRET = 'server-secret-key';

    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    securityLogger = {
      logUnauthorizedAccess: jest.fn(),
      logInvalidToken: jest.fn(),
    };
    tokenBlacklist = { isTokenBlacklisted: jest.fn() };

    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
      securityLogger as unknown as SecurityLoggerService,
      tokenBlacklist as unknown as TokenBlacklistService,
    );
  });

  afterEach(() => {
    process.env.SERVER_AUTH_SECRET = originalSecret;
    jest.clearAllMocks();
  });

  it('deve liberar rota pública sem validar API key nem JWT', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const ctx = createExecutionContext({
      headers: {},
      method: 'GET',
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('deve negar quando x-api-key está ausente', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = createExecutionContext({
      headers: {},
      method: 'GET',
    });

    let thrown: unknown;
    try {
      await guard.canActivate(ctx);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect((thrown as UnauthorizedException).message).toBe(
      'Authentication required',
    );
  });

  it('deve negar quando x-api-key não confere com SERVER_AUTH_SECRET', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = createExecutionContext({
      headers: { 'x-api-key': 'wrong' },
      method: 'GET',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('deve permitir OPTIONS após API key válida, sem JWT', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = createExecutionContext({
      headers: { 'x-api-key': 'server-secret-key' },
      method: 'OPTIONS',
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('deve registrar e negar quando não há Bearer token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    const ctx = createExecutionContext({
      headers: { 'x-api-key': 'server-secret-key' },
      method: 'GET',
      url: '/api/x',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('jest-agent'),
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(securityLogger.logUnauthorizedAccess).toHaveBeenCalledWith(
      '/api/x',
      'GET',
      '127.0.0.1',
      undefined,
      'jest-agent',
    );
  });

  it('deve anexar user ao request e retornar true com JWT válido', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = { sub: 'u1', jti: undefined };
    jwtService.verifyAsync.mockResolvedValue(payload);

    const req = {
      headers: {
        'x-api-key': 'server-secret-key',
        authorization: 'Bearer valid.jwt.token',
      },
      method: 'GET',
      url: '/',
      ip: '1.1.1.1',
      get: jest.fn().mockReturnValue('ua'),
    };

    const ctx = createExecutionContext(req);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req['user']).toBe(payload);
    expect(tokenBlacklist.isTokenBlacklisted).not.toHaveBeenCalled();
  });

  it('deve negar quando jti está na blacklist', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ jti: 'revoked-id' });
    tokenBlacklist.isTokenBlacklisted.mockResolvedValue(true);

    const ctx = createExecutionContext({
      headers: {
        'x-api-key': 'server-secret-key',
        authorization: 'Bearer t.k.n',
      },
      method: 'POST',
      url: '/p',
      ip: '2.2.2.2',
      get: jest.fn().mockReturnValue('ua2'),
    });

    let thrown: unknown;
    try {
      await guard.canActivate(ctx);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect((thrown as UnauthorizedException).message).toBe('Token foi revogado!');
    expect(securityLogger.logInvalidToken).toHaveBeenCalled();
  });

  it('deve negar e registrar quando verifyAsync falha', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('expired'));

    const ctx = createExecutionContext({
      headers: {
        'x-api-key': 'server-secret-key',
        authorization: 'Bearer a.b.c',
      },
      method: 'GET',
      url: '/e',
      ip: '3.3.3.3',
      get: jest.fn().mockReturnValue('ua3'),
    });

    let thrown: unknown;
    try {
      await guard.canActivate(ctx);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(UnauthorizedException);
    expect((thrown as UnauthorizedException).message).toBe(
      'Token inválido ou expirado!',
    );
    expect(securityLogger.logInvalidToken).toHaveBeenCalledWith(
      '3.3.3.3',
      '/e',
      'ua3',
      'expired',
    );
  });

  it('deve usar connection.remoteAddress quando ip estiver ausente', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1' });

    const req = {
      headers: {
        'x-api-key': 'server-secret-key',
        authorization: 'Bearer tok',
      },
      method: 'GET',
      url: '/',
      ip: undefined,
      connection: { remoteAddress: '::ffff:10.0.0.1' },
      get: jest.fn().mockReturnValue('ua'),
    } as unknown as Partial<Request>;

    await expect(
      guard.canActivate(createExecutionContext(req)),
    ).resolves.toBe(true);
  });

  it('deve registrar mensagem genérica quando verify falhar sem Error', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue('string-fail');

    const ctx = createExecutionContext({
      headers: {
        'x-api-key': 'server-secret-key',
        authorization: 'Bearer a.b.c',
      },
      method: 'GET',
      url: '/z',
      ip: '9.9.9.9',
      get: jest.fn().mockReturnValue('ua-z'),
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    expect(securityLogger.logInvalidToken).toHaveBeenCalledWith(
      '9.9.9.9',
      '/z',
      'ua-z',
      'Token inválido ou expirado',
    );
  });
});
