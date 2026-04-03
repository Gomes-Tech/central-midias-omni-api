import { UserRepository } from '../repository';
import { DeleteUserUseCase } from './delete-user.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { makeUser } from './test-helpers';

describe('DeleteUserUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let useCase: DeleteUserUseCase;

  beforeEach(() => {
    userRepository = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    findUserByIdUseCase = {
      execute: jest.fn().mockResolvedValue(makeUser()),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    useCase = new DeleteUserUseCase(userRepository, findUserByIdUseCase);
  });

  it('deve validar o usuário antes de excluir', async () => {
    userRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute('user-id')).resolves.toBeUndefined();
    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith('user-id');
    expect(userRepository.delete).toHaveBeenCalledWith('user-id');
  });
});
