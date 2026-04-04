import { BadRequestException } from '@common/filters';
import { CreateCategoryRoleAccessUseCase } from '@modules/category-role-access/use-cases/create-category-role-access.use-case';
import { RolesRepository } from '../repository';
import { makeCreateRoleDTO } from './test-helpers';
import { CreateRoleUseCase } from './create-role.use-case';

describe('CreateRoleUseCase', () => {
  let rolesRepository: jest.Mocked<
    Pick<RolesRepository, 'findByName' | 'create'>
  >;
  let createCategoryRoleAccessUseCase: jest.Mocked<
    Pick<CreateCategoryRoleAccessUseCase, 'execute'>
  >;
  let useCase: CreateRoleUseCase;

  beforeEach(() => {
    rolesRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    };
    createCategoryRoleAccessUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new CreateRoleUseCase(
      rolesRepository as unknown as RolesRepository,
      createCategoryRoleAccessUseCase as unknown as CreateCategoryRoleAccessUseCase,
    );
  });

  it('deve criar perfil e vincular categorias quando o nome estiver livre', async () => {
    const dto = makeCreateRoleDTO({
      categoryRoleAccesses: [
        { categoryId: 'c1' },
        { categoryId: 'c2' },
      ],
    });
    const orgId = 'org-1';

    rolesRepository.findByName.mockResolvedValue(null);
    rolesRepository.create.mockResolvedValue({ id: 'new-role', name: dto.name });

    await expect(useCase.execute(dto, orgId)).resolves.toBeUndefined();

    expect(rolesRepository.findByName).toHaveBeenCalledWith(dto.name);
    expect(rolesRepository.create).toHaveBeenCalledWith(dto);
    expect(createCategoryRoleAccessUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createCategoryRoleAccessUseCase.execute).toHaveBeenNthCalledWith(
      1,
      orgId,
      { categoryId: 'c1', roleId: 'new-role' },
    );
    expect(createCategoryRoleAccessUseCase.execute).toHaveBeenNthCalledWith(
      2,
      orgId,
      { categoryId: 'c2', roleId: 'new-role' },
    );
  });

  it('deve lançar BadRequest quando o nome já existir', async () => {
    const dto = makeCreateRoleDTO({ name: 'EXISTING' });
    rolesRepository.findByName.mockResolvedValue({ id: 'r1', name: 'EXISTING' } as never);

    await expect(useCase.execute(dto, 'org-1')).rejects.toThrow(
      'Já existe um perfil com este nome',
    );

    expect(rolesRepository.create).not.toHaveBeenCalled();
    expect(createCategoryRoleAccessUseCase.execute).not.toHaveBeenCalled();
  });
});
