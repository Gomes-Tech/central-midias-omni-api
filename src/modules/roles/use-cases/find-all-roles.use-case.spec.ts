import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { FindAllRolesUseCase } from './find-all-roles.use-case';

describe('FindAllRolesUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findAll'>>;
  let useCase: FindAllRolesUseCase;

  beforeEach(() => {
    repository = { findAll: jest.fn() };
    useCase = new FindAllRolesUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve delegar ao repositório com filtros', async () => {
    const response = [makeRole()];
    repository.findAll.mockResolvedValue(response);

    const filters = { label: 'Admin' };

    await expect(useCase.execute(filters)).resolves.toEqual(response);
    expect(repository.findAll).toHaveBeenCalledWith(filters);
  });

  it('deve usar filtros vazios por padrão', async () => {
    const response: ReturnType<typeof makeRole>[] = [];
    repository.findAll.mockResolvedValue(response);

    await expect(useCase.execute()).resolves.toEqual(response);
    expect(repository.findAll).toHaveBeenCalledWith({});
  });
});
