import { SecurityLoggerService } from '@infrastructure/security';
import { UpdateTokenPasswordUseCase } from '@modules/token-password/use-cases/update-token-password.use-case';
import { VerifyTokenPasswordUseCase } from '@modules/token-password/use-cases/verify-token-password.use-case';
import { FindUserByEmailUseCase } from '@modules/user/use-cases/find-user-by-email.use-case';
import { UpdateUserUseCase } from '@modules/user/use-cases/update-user.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { ResetPasswordUseCase } from './reset-password-user.use-case';

describe('ResetPasswordUseCase', () => {
  let verifyTokenPasswordUseCase: jest.Mocked<VerifyTokenPasswordUseCase>;
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let updateTokenPasswordUseCase: jest.Mocked<UpdateTokenPasswordUseCase>;
  let securityLogger: jest.Mocked<SecurityLoggerService>;
  let useCase: ResetPasswordUseCase;

  beforeEach(() => {
    verifyTokenPasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<VerifyTokenPasswordUseCase>;

    findUserByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    updateUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateUserUseCase>;

    updateTokenPasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateTokenPasswordUseCase>;

    securityLogger = {
      logPasswordResetAttempt: jest.fn(),
    } as unknown as jest.Mocked<SecurityLoggerService>;

    useCase = new ResetPasswordUseCase(
      verifyTokenPasswordUseCase,
      findUserByEmailUseCase,
      updateUserUseCase,
      updateTokenPasswordUseCase,
      securityLogger,
    );
  });

  it('deve atualizar senha e invalidar token após verificação', async () => {
    const user = makeUser();
    const token = 'reset-token';
    const newPassword = 'NewSecurePass123';

    verifyTokenPasswordUseCase.execute.mockResolvedValue(undefined);
    findUserByEmailUseCase.execute.mockResolvedValue(user);
    updateUserUseCase.execute.mockResolvedValue(undefined);
    updateTokenPasswordUseCase.execute.mockResolvedValue(undefined);

    await expect(
      useCase.execute(token, user.email, newPassword, '10.0.0.1', 'agent'),
    ).resolves.toBeUndefined();

    expect(verifyTokenPasswordUseCase.execute).toHaveBeenCalledWith(
      token,
      user.email,
    );
    expect(updateUserUseCase.execute).toHaveBeenCalledWith(
      user.id,
      { password: newPassword },
      user.id,
    );
    expect(updateTokenPasswordUseCase.execute).toHaveBeenCalledWith(user.email);
    expect(securityLogger.logPasswordResetAttempt).toHaveBeenCalledWith(
      user.email,
      '10.0.0.1',
      true,
      'agent',
    );
  });

  it('deve registrar falha e relançar erro quando a verificação do token falhar', async () => {
    verifyTokenPasswordUseCase.execute.mockRejectedValue(new Error('token inválido'));

    await expect(
      useCase.execute('bad', 'any@test.com', 'pass'),
    ).rejects.toThrow('token inválido');

    expect(securityLogger.logPasswordResetAttempt).toHaveBeenCalledWith(
      'any@test.com',
      'unknown',
      false,
      undefined,
    );
    expect(updateUserUseCase.execute).not.toHaveBeenCalled();
  });
});
