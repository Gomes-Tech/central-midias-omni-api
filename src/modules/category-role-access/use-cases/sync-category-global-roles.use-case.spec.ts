import { CategoryRoleAccessRepository } from '../repository';
import { SyncCategoryGlobalRolesUseCase } from './sync-category-global-roles.use-case';

describe('SyncCategoryGlobalRolesUseCase', () => {
  let repository: jest.Mocked<
    Pick<
      CategoryRoleAccessRepository,
      'syncCategoryWithGlobalRolesInOrganization'
    >
  >;
  let useCase: SyncCategoryGlobalRolesUseCase;

  beforeEach(() => {
    repository = {
      syncCategoryWithGlobalRolesInOrganization: jest.fn(),
    };

    useCase = new SyncCategoryGlobalRolesUseCase(
      repository as unknown as CategoryRoleAccessRepository,
    );
  });

  it('deve sincronizar uma categoria com os perfis globais da organização', async () => {
    repository.syncCategoryWithGlobalRolesInOrganization.mockResolvedValue(
      undefined,
    );

    await expect(
      useCase.execute('cat-1', 'org-1'),
    ).resolves.toBeUndefined();

    expect(
      repository.syncCategoryWithGlobalRolesInOrganization,
    ).toHaveBeenCalledWith('cat-1', 'org-1');
  });

  it('deve propagar o erro quando o repositório falhar', async () => {
    repository.syncCategoryWithGlobalRolesInOrganization.mockRejectedValue(
      new Error('falhou'),
    );

    await expect(useCase.execute('cat-1', 'org-1')).rejects.toThrow(
      'falhou',
    );
  });
});
