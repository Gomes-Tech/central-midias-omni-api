import { NotFoundException } from '@common/filters';
import { CategoryRoleAccessRepository } from '../repository';
import { FindRolesByCategoryUseCase } from './find-roles-by-category.use-case';

describe('FindRolesByCategoryUseCase', () => {
  let repository: jest.Mocked<
    Pick<
      CategoryRoleAccessRepository,
      | 'findActiveCategoryInOrganization'
      | 'findRoleIdsByCategoryAndOrganization'
      | 'findRolesByIds'
    >
  >;
  let useCase: FindRolesByCategoryUseCase;

  beforeEach(() => {
    repository = {
      findActiveCategoryInOrganization: jest.fn(),
      findRoleIdsByCategoryAndOrganization: jest.fn(),
      findRolesByIds: jest.fn(),
    };

    useCase = new FindRolesByCategoryUseCase(
      repository as unknown as CategoryRoleAccessRepository,
    );
  });

  it('deve retornar isUnrestricted true quando não houver perfis vinculados', async () => {
    repository.findActiveCategoryInOrganization.mockResolvedValue({ id: 'cat-1' });
    repository.findRoleIdsByCategoryAndOrganization.mockResolvedValue([]);

    await expect(
      useCase.execute('cat-1', 'org-1'),
    ).resolves.toEqual({ isUnrestricted: true, roles: [] });

    expect(repository.findRolesByIds).not.toHaveBeenCalled();
  });

  it('deve retornar perfis quando houver ids vinculados', async () => {
    const roles = [
      { id: 'r1', name: 'ADMIN', label: 'Admin' },
    ];
    repository.findActiveCategoryInOrganization.mockResolvedValue({ id: 'cat-1' });
    repository.findRoleIdsByCategoryAndOrganization.mockResolvedValue(['r1']);
    repository.findRolesByIds.mockResolvedValue(roles);

    await expect(useCase.execute('cat-1', 'org-1')).resolves.toEqual({
      isUnrestricted: false,
      roles,
    });

    expect(repository.findRolesByIds).toHaveBeenCalledWith(['r1']);
  });

  it('deve lançar NotFound quando a categoria não existir', async () => {
    repository.findActiveCategoryInOrganization.mockResolvedValue(null);

    await expect(useCase.execute('cat-x', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findRoleIdsByCategoryAndOrganization).not.toHaveBeenCalled();
  });
});
