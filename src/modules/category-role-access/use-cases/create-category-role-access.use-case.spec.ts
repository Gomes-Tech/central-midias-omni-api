import {
  BadRequestException,
  NotFoundException,
} from '@common/filters';
import { CreateCategoryRoleAccessDTO } from '../dto/create-category-role-access.dto';
import { CategoryRoleAccessRepository } from '../repository';
import { CreateCategoryRoleAccessUseCase } from './create-category-role-access.use-case';

describe('CreateCategoryRoleAccessUseCase', () => {
  let repository: jest.Mocked<CategoryRoleAccessRepository>;
  let useCase: CreateCategoryRoleAccessUseCase;

  const orgId = 'org-1';
  const dto: CreateCategoryRoleAccessDTO = {
    categoryId: 'cat-1',
    roleId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  };

  beforeEach(() => {
    repository = {
      findActiveCategoryInOrganization: jest.fn(),
      findActiveRole: jest.fn(),
      findByCategoryRoleAndOrganization: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<CategoryRoleAccessRepository>;

    useCase = new CreateCategoryRoleAccessUseCase(repository);
  });

  it('deve criar vínculo quando categoria, perfil existirem e não houver duplicata', async () => {
    const created = { id: 'cra-1' } as never;
    repository.findActiveCategoryInOrganization.mockResolvedValue({ id: 'cat-1' });
    repository.findActiveRole.mockResolvedValue({ id: dto.roleId });
    repository.findByCategoryRoleAndOrganization.mockResolvedValue(null);
    repository.create.mockResolvedValue(created);

    await expect(useCase.execute(orgId, dto)).resolves.toBe(created);

    expect(repository.findActiveCategoryInOrganization).toHaveBeenCalledWith(
      dto.categoryId,
      orgId,
    );
    expect(repository.create).toHaveBeenCalledWith(orgId, dto);
  });

  it('deve lançar NotFound quando a categoria não existir na organização', async () => {
    repository.findActiveCategoryInOrganization.mockResolvedValue(null);

    await expect(useCase.execute(orgId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findActiveRole).not.toHaveBeenCalled();
  });

  it('deve lançar NotFound quando o perfil não existir', async () => {
    repository.findActiveCategoryInOrganization.mockResolvedValue({ id: 'cat-1' });
    repository.findActiveRole.mockResolvedValue(null);

    await expect(useCase.execute(orgId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.findByCategoryRoleAndOrganization).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando já existir vínculo categoria–perfil', async () => {
    repository.findActiveCategoryInOrganization.mockResolvedValue({ id: 'cat-1' });
    repository.findActiveRole.mockResolvedValue({ id: dto.roleId });
    repository.findByCategoryRoleAndOrganization.mockResolvedValue({
      id: 'existing',
    });

    await expect(useCase.execute(orgId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
