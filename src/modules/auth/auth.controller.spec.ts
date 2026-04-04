import { UnauthorizedException } from '@common/filters';
import { VerifyTokenPasswordUseCase } from '@modules/token-password';
import { Test, TestingModule } from '@nestjs/testing';
import { Request } from 'express';
import { AuthController } from './auth.controller';
import {
  FirstAccessUserUseCase,
  ForgotPasswordUseCase,
  LogoutUserUseCase,
  RefreshTokenUseCase,
  ResetPasswordUseCase,
  SignInUseCase,
} from './use-cases';

function makeRequest(overrides: Record<string, unknown> = {}): Request {
  return {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    get: jest.fn((name: string) =>
      name === 'user-agent' ? 'jest' : undefined,
    ),
    headers: {},
    ...overrides,
  } as unknown as Request;
}

describe('AuthController', () => {
  let controller: AuthController;
  let signInUser: { execute: jest.Mock };
  let logoutUserUseCase: { execute: jest.Mock };
  let refreshTokenUseCase: { execute: jest.Mock };
  let forgotPasswordUseCase: { execute: jest.Mock };
  let resetPasswordUseCase: { execute: jest.Mock };
  let verifyTokenPasswordUseCase: { execute: jest.Mock };
  let firstAccessUserUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    signInUser = { execute: jest.fn() };
    logoutUserUseCase = { execute: jest.fn() };
    refreshTokenUseCase = { execute: jest.fn() };
    forgotPasswordUseCase = { execute: jest.fn() };
    resetPasswordUseCase = { execute: jest.fn() };
    verifyTokenPasswordUseCase = { execute: jest.fn() };
    firstAccessUserUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: SignInUseCase, useValue: signInUser },
        { provide: LogoutUserUseCase, useValue: logoutUserUseCase },
        { provide: RefreshTokenUseCase, useValue: refreshTokenUseCase },
        { provide: ForgotPasswordUseCase, useValue: forgotPasswordUseCase },
        { provide: ResetPasswordUseCase, useValue: resetPasswordUseCase },
        {
          provide: VerifyTokenPasswordUseCase,
          useValue: verifyTokenPasswordUseCase,
        },
        { provide: FirstAccessUserUseCase, useValue: firstAccessUserUseCase },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('signIn', () => {
    it('deve repassar ip, user-agent e retornar tokens', async () => {
      const dto = { email: 'a@b.com', password: 'secret' } as Parameters<
        AuthController['signIn']
      >[0];
      const tokens = {
        accessToken: 'a',
        refreshToken: 'r',
      };
      signInUser.execute.mockResolvedValue(tokens);
      const req = makeRequest();

      const result = await controller.signIn(dto, req);

      expect(result).toEqual(tokens);
      expect(signInUser.execute).toHaveBeenCalledWith(dto, '127.0.0.1', 'jest');
    });

    it('deve usar unknown quando ip e user-agent não existirem', async () => {
      const dto = { email: 'a@b.com', password: 'x' } as Parameters<
        AuthController['signIn']
      >[0];
      signInUser.execute.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const req = makeRequest({
        ip: undefined,
        socket: undefined,
        get: () => undefined,
      });

      await controller.signIn(dto, req);

      expect(signInUser.execute).toHaveBeenCalledWith(
        dto,
        'unknown',
        'unknown',
      );
    });

    it('deve usar remoteAddress quando ip estiver ausente', async () => {
      const dto = { email: 'a@b.com', password: 'x' } as Parameters<
        AuthController['signIn']
      >[0];
      signInUser.execute.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });
      const req = makeRequest({
        ip: undefined,
        socket: { remoteAddress: '10.0.0.5' },
      });

      await controller.signIn(dto, req);

      expect(signInUser.execute).toHaveBeenCalledWith(
        dto,
        '10.0.0.5',
        'jest',
      );
    });
  });

  describe('refresh', () => {
    it('deve retornar novos tokens quando refreshToken existir', async () => {
      refreshTokenUseCase.execute.mockResolvedValue({
        accessToken: 'na',
        refreshToken: 'nr',
      });

      const result = await controller.refresh({ refreshToken: 'old' });

      expect(refreshTokenUseCase.execute).toHaveBeenCalledWith('old');
      expect(result).toEqual({
        accessToken: 'na',
        refreshToken: 'nr',
      });
    });

    it('deve lançar UnauthorizedException quando refreshToken estiver ausente', async () => {
      await expect(controller.refresh({} as { refreshToken: string })).rejects.toThrow(
        UnauthorizedException,
      );
      expect(refreshTokenUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('deve extrair access token do header e delegar ao use case', async () => {
      logoutUserUseCase.execute.mockResolvedValue(undefined);
      const req = makeRequest({
        headers: { authorization: 'Bearer access-jwt' },
      });

      const result = await controller.logout(req, { refreshToken: 'r' });

      expect(logoutUserUseCase.execute).toHaveBeenCalledWith(
        'access-jwt',
        'r',
      );
      expect(result).toEqual({ success: true });
    });

    it('deve delegar com access token undefined sem Authorization', async () => {
      logoutUserUseCase.execute.mockResolvedValue(undefined);
      const req = makeRequest({ headers: {} });

      await controller.logout(req, { refreshToken: 'r2' });

      expect(logoutUserUseCase.execute).toHaveBeenCalledWith(undefined, 'r2');
    });
  });

  describe('firstAccess', () => {
    it('deve delegar ao FirstAccessUserUseCase', async () => {
      firstAccessUserUseCase.execute.mockResolvedValue(undefined);

      await controller.firstAccess({ newPassword: 'Novo!12345' }, 'uid-1');

      expect(firstAccessUserUseCase.execute).toHaveBeenCalledWith(
        'uid-1',
        'Novo!12345',
      );
    });
  });

  describe('forgotPassword', () => {
    it('deve delegar email ao ForgotPasswordUseCase', async () => {
      forgotPasswordUseCase.execute.mockResolvedValue(undefined);

      const result = await controller.forgotPassword({
        email: 'a@b.com',
      } as Parameters<AuthController['forgotPassword']>[0]);

      expect(forgotPasswordUseCase.execute).toHaveBeenCalledWith('a@b.com');
      expect(result).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    it('deve delegar ao VerifyTokenPasswordUseCase', async () => {
      const payload = {
        email: 'a@b.com',
        expiresAt: new Date('2030-01-01'),
      };
      verifyTokenPasswordUseCase.execute.mockResolvedValue(payload);
      const dto = { token: 't', email: 'a@b.com' } as Parameters<
        AuthController['verifyToken']
      >[0];

      const result = await controller.verifyToken(dto);

      expect(verifyTokenPasswordUseCase.execute).toHaveBeenCalledWith(
        't',
        'a@b.com',
      );
      expect(result).toEqual(payload);
    });
  });

  describe('resetPassword', () => {
    it('deve repassar ip, user-agent e credenciais', async () => {
      resetPasswordUseCase.execute.mockResolvedValue(undefined);
      const dto = {
        token: 'tok',
        email: 'a@b.com',
        password: 'New!12345',
      } as Parameters<AuthController['resetPassword']>[0];
      const req = makeRequest();

      await controller.resetPassword(dto, req);

      expect(resetPasswordUseCase.execute).toHaveBeenCalledWith(
        'tok',
        'a@b.com',
        'New!12345',
        '127.0.0.1',
        'jest',
      );
    });

    it('deve usar unknown para ip e user-agent quando ausentes', async () => {
      resetPasswordUseCase.execute.mockResolvedValue(undefined);
      const dto = {
        token: 't',
        email: 'e@e.com',
        password: 'P!12345',
      } as Parameters<AuthController['resetPassword']>[0];
      const req = makeRequest({
        ip: undefined,
        socket: undefined,
        get: () => undefined,
      });

      await controller.resetPassword(dto, req);

      expect(resetPasswordUseCase.execute).toHaveBeenCalledWith(
        't',
        'e@e.com',
        'P!12345',
        'unknown',
        'unknown',
      );
    });
  });
});
