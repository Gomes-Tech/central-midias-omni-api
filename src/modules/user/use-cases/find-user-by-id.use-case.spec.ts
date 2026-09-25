import { NotFoundException } from '@common/filters';
import { UserRepository } from '../repository';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { makeUserById } from './test-helpers';

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
    const user = makeUserById();

    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(user.id, 'org-1')).resolves.toEqual(user);
    expect(userRepository.findById).toHaveBeenCalledWith(user.id, 'org-1');
  });

  it('deve buscar usuário sem filtro de org quando organizationId não for informado', async () => {
    const user = makeUserById();

    userRepository.findById.mockResolvedValue(user);

    await expect(useCase.execute(user.id)).resolves.toEqual(user);
    expect(userRepository.findById).toHaveBeenCalledWith(user.id, undefined);
  });

  it('deve lançar not found quando usuário não existir', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
