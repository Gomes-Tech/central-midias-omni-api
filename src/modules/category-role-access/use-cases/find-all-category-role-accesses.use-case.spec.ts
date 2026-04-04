import { CategoryRoleAccessRepository } from '../repository';
import { FindAllCategoryRoleAccessesUseCase } from './find-all-category-role-accesses.use-case';

describe('FindAllCategoryRoleAccessesUseCase', () => {
  let repository: jest.Mocked<
    Pick<CategoryRoleAccessRepository, 'findAllByOrganization'>
  >;
  let useCase: FindAllCategoryRoleAccessesUseCase;

  beforeEach(() => {
    repository = {
      findAllByOrganization: jest.fn(),
    };

    useCase = new FindAllCategoryRoleAccessesUseCase(
      repository as unknown as CategoryRoleAccessRepository,
    );
  });

  it('deve delegar ao repositório com organizationId', async () => {
    const rows = [{ id: '1' }] as never[];
    repository.findAllByOrganization.mockResolvedValue(rows);

    await expect(useCase.execute('org-1')).resolves.toBe(rows);
    expect(repository.findAllByOrganization).toHaveBeenCalledWith('org-1');
  });
});
