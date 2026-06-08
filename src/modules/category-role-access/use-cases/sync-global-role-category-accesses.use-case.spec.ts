import { CategoryRoleAccessRepository } from '../repository';
import { SyncGlobalRoleCategoryAccessesUseCase } from './sync-global-role-category-accesses.use-case';

describe('SyncGlobalRoleCategoryAccessesUseCase', () => {
  let repository: jest.Mocked<
    Pick<
      CategoryRoleAccessRepository,
      | 'syncGlobalRoleWithOrganizationCategories'
      | 'findAllActiveOrganizationIds'
      | 'findAllActiveGlobalRoleIds'
    >
  >;
  let useCase: SyncGlobalRoleCategoryAccessesUseCase;

  beforeEach(() => {
    repository = {
      syncGlobalRoleWithOrganizationCategories: jest.fn(),
      findAllActiveOrganizationIds: jest.fn(),
      findAllActiveGlobalRoleIds: jest.fn(),
    };

    useCase = new SyncGlobalRoleCategoryAccessesUseCase(
      repository as unknown as CategoryRoleAccessRepository,
    );
  });

  it('deve sincronizar um perfil global com uma organização', async () => {
    repository.syncGlobalRoleWithOrganizationCategories.mockResolvedValue(
      undefined,
    );

    await expect(
      useCase.execute('role-1', 'org-1'),
    ).resolves.toBeUndefined();

    expect(
      repository.syncGlobalRoleWithOrganizationCategories,
    ).toHaveBeenCalledWith('role-1', 'org-1');
  });

  it('deve sincronizar um perfil global em todas as organizações ativas', async () => {
    repository.findAllActiveOrganizationIds.mockResolvedValue(['org-1', 'org-2']);
    repository.syncGlobalRoleWithOrganizationCategories.mockResolvedValue(
      undefined,
    );

    await expect(
      useCase.executeForAllOrganizations('role-1'),
    ).resolves.toBeUndefined();

    expect(repository.syncGlobalRoleWithOrganizationCategories).toHaveBeenCalledTimes(
      2,
    );
  });

  it('deve sincronizar todos os perfis globais existentes', async () => {
    repository.findAllActiveGlobalRoleIds.mockResolvedValue(['role-1', 'role-2']);
    repository.findAllActiveOrganizationIds.mockResolvedValue(['org-1']);
    repository.syncGlobalRoleWithOrganizationCategories.mockResolvedValue(
      undefined,
    );

    await expect(useCase.executeForAllExistingGlobalRoles()).resolves.toEqual({
      roleCount: 2,
      organizationCount: 1,
    });

    expect(repository.syncGlobalRoleWithOrganizationCategories).toHaveBeenCalledTimes(
      2,
    );
  });
});
