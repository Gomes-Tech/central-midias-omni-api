import { CreateTokenPasswordUseCase } from '@modules/token-password/use-cases/create-token-password.use-case';
import { FindUserByEmailUseCase } from '@modules/user/use-cases/find-user-by-email.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { ForgotPasswordUseCase } from './forgot-password-user.use-case';

describe('ForgotPasswordUseCase', () => {
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let createTokenPasswordUseCase: jest.Mocked<CreateTokenPasswordUseCase>;
  let useCase: ForgotPasswordUseCase;

  beforeEach(() => {
    findUserByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    createTokenPasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTokenPasswordUseCase>;

    useCase = new ForgotPasswordUseCase(
      findUserByEmailUseCase,
      createTokenPasswordUseCase,
    );
  });

  it('deve criar token de recuperação quando o usuário existir', async () => {
    const user = makeUser({ email: 'exists@test.com' });

    findUserByEmailUseCase.execute.mockResolvedValue(user);
    createTokenPasswordUseCase.execute.mockResolvedValue(undefined);

    await expect(useCase.execute(user.email)).resolves.toBeUndefined();

    expect(createTokenPasswordUseCase.execute).toHaveBeenCalledWith(user.email);
  });

  it('não deve criar token quando o usuário não existir (sem vazar enumeração)', async () => {
    findUserByEmailUseCase.execute.mockRejectedValue(new Error('not found'));

    await expect(useCase.execute('missing@test.com')).resolves.toBeUndefined();

    expect(createTokenPasswordUseCase.execute).not.toHaveBeenCalled();
  });
});
