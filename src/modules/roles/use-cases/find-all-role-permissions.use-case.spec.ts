import { RolesRepository } from '../repository';
import { FindAllRolePermissionsUseCase } from './find-all-role-permissions.use-case';

describe('FindAllRolePermissionsUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findAllPermissions'>>;
  let useCase: FindAllRolePermissionsUseCase;

  beforeEach(() => {
    repository = { findAllPermissions: jest.fn() };
    useCase = new FindAllRolePermissionsUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve delegar ao repositório com organizationId e filtros', async () => {
    const result = {
      data: [],
      total: 0,
      page: 2,
      totalPages: 0,
    };
    repository.findAllPermissions.mockResolvedValue(result);

    await expect(
      useCase.execute('org-1', { page: 2, searchTerm: 'editor' }),
    ).resolves.toEqual(result);
    expect(repository.findAllPermissions).toHaveBeenCalledWith('org-1', {
      page: 2,
      searchTerm: 'editor',
    });
  });

  it('deve usar filtros vazios por padrão', async () => {
    repository.findAllPermissions.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await useCase.execute('org-1');

    expect(repository.findAllPermissions).toHaveBeenCalledWith('org-1', {});
  });
});
