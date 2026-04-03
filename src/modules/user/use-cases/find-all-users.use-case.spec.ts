import { UserRepository } from '../repository';
import { FindAllUsersUseCase } from './find-all-users.use-case';

describe('FindAllUsersUseCase', () => {
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: FindAllUsersUseCase;

  beforeEach(() => {
    userRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    useCase = new FindAllUsersUseCase(userRepository);
  });

  it('deve repassar os filtros para o repositório', async () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    };

    userRepository.findAll.mockResolvedValue(response);

    const result = await useCase.execute({ page: 1, limit: 10, name: 'John' });

    expect(userRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      name: 'John',
    });
    expect(result).toEqual(response);
  });
});
