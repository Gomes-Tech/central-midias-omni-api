import { BadRequestException } from '@common/filters';
import { FindUserByIdUseCase } from '@modules/user/use-cases/find-user-by-id.use-case';
import { UpdateUserUseCase } from '@modules/user/use-cases/update-user.use-case';
import { makeUser } from '@modules/user/use-cases/test-helpers';
import { FirstAccessUserUseCase } from './first-access-user.use-case';

describe('FirstAccessUserUseCase', () => {
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let updateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let useCase: FirstAccessUserUseCase;

  beforeEach(() => {
    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    updateUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateUserUseCase>;

    useCase = new FirstAccessUserUseCase(findUserByIdUseCase, updateUserUseCase);
  });

  it('deve definir senha e encerrar primeiro acesso quando isFirstAccess for true', async () => {
    const user = makeUser({ id: 'user-1', isFirstAccess: true });
    const newPassword = 'FirstAccessPass123';

    findUserByIdUseCase.execute.mockResolvedValue(user);
    updateUserUseCase.execute.mockResolvedValue(undefined);

    await expect(useCase.execute(user.id, newPassword)).resolves.toBeUndefined();

    expect(updateUserUseCase.execute).toHaveBeenCalledWith(
      user.id,
      { isFirstAccess: false, password: newPassword },
      user.id,
    );
  });

  it('deve lançar BadRequestException quando o usuário já tiver completado o primeiro acesso', async () => {
    const user = makeUser({ isFirstAccess: false });

    findUserByIdUseCase.execute.mockResolvedValue(user);

    await expect(useCase.execute(user.id, 'pass')).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(updateUserUseCase.execute).not.toHaveBeenCalled();
  });
});
