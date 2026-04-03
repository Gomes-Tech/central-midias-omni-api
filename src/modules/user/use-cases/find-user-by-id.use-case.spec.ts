import { NotFoundException } from '@common/filters';
import { UserRepository } from '../repository';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { makeUser } from './test-helpers';

describe('FindUserByIdUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: FindUserByIdUseCase;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    useCase = new FindUserByIdUseCase(userRepository);
  });

  it('deve retornar usuário por id', async () => {
    const user = makeUser();

    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(user.id)).resolves.toEqual(user);
  });

  it('deve lançar not found quando usuário não existir', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
