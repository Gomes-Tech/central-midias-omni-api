import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { MaterialController } from './material.controller';
import {
  CreateMaterialUseCase,
  DeleteMaterialUseCase,
  FindAllMaterialsUseCase,
  FindMaterialByIdUseCase,
  UpdateMaterialUseCase,
} from './use-cases';
import {
  makeCreateMaterialDTO,
  makeFindAllMaterialsFiltersDTO,
  makeMaterialDetails,
  makeMaterialListItem,
  makeUpdateMaterialDTO,
} from './use-cases/test-helpers';

describe('MaterialController', () => {
  let controller: MaterialController;
  let createMaterialUseCase: { execute: jest.Mock };
  let deleteMaterialUseCase: { execute: jest.Mock };
  let findAllMaterialsUseCase: { execute: jest.Mock };
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let updateMaterialUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createMaterialUseCase = { execute: jest.fn() };
    deleteMaterialUseCase = { execute: jest.fn() };
    findAllMaterialsUseCase = { execute: jest.fn() };
    findMaterialByIdUseCase = { execute: jest.fn() };
    updateMaterialUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialController],
      providers: [
        { provide: CreateMaterialUseCase, useValue: createMaterialUseCase },
        { provide: DeleteMaterialUseCase, useValue: deleteMaterialUseCase },
        {
          provide: FindAllMaterialsUseCase,
          useValue: findAllMaterialsUseCase,
        },
        {
          provide: FindMaterialByIdUseCase,
          useValue: findMaterialByIdUseCase,
        },
        { provide: UpdateMaterialUseCase, useValue: updateMaterialUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<MaterialController>(MaterialController);
  });

  it('deve delegar findAll com org e filtros', async () => {
    const filters = makeFindAllMaterialsFiltersDTO({ searchTerm: 'inst' });
    const payload = [makeMaterialListItem()];
    findAllMaterialsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findAll('org-id', filters);

    expect(result).toBe(payload);
    expect(findAllMaterialsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      filters,
    );
  });

  it('deve delegar findById', async () => {
    const material = makeMaterialDetails();
    findMaterialByIdUseCase.execute.mockResolvedValue(material);

    await controller.findById(material.id, 'org-id');

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      material.id,
      'org-id',
    );
  });

  it('deve delegar create', async () => {
    const dto = makeCreateMaterialDTO();
    createMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.create(dto, 'org-id', 'user-id');

    expect(createMaterialUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
    );
  });

  it('deve delegar update', async () => {
    const dto = makeUpdateMaterialDTO({ name: 'Novo nome' });
    updateMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.update('material-id', dto, 'org-id', 'user-id');

    expect(updateMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      dto,
      'user-id',
    );
  });

  it('deve delegar delete', async () => {
    deleteMaterialUseCase.execute.mockResolvedValue(undefined);

    await controller.delete('material-id', 'org-id', 'user-id');

    expect(deleteMaterialUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      'user-id',
    );
  });
});
