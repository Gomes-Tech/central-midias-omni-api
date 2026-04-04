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
    const list = [makeRole()];
    repository.findAll.mockResolvedValue(list);

    const filters = { isSystem: true };

    await expect(useCase.execute(filters)).resolves.toEqual(list);
    expect(repository.findAll).toHaveBeenCalledWith(filters);
  });

  it('deve usar filtros vazios por padrão', async () => {
    repository.findAll.mockResolvedValue([]);

    await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith({});
  });
});
