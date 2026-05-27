import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import {
  CreateTagUseCase,
  DeleteTagUseCase,
  FindAllTagsUseCase,
  FindSelectTagsUseCase,
  FindTagByIdUseCase,
  UpdateTagUseCase,
} from './use-cases';
import {
  makeCreateTagDTO,
  makeFindAllTagsFiltersDTO,
  makeTagEntity,
  makeUpdateTagDTO,
} from './use-cases/test-helpers';

describe('TagController', () => {
  const organizationId = 'organization-id';
  let controller: TagController;
  let createTagUseCase: { execute: jest.Mock };
  let deleteTagUseCase: { execute: jest.Mock };
  let findAllTagsUseCase: { execute: jest.Mock };
  let findSelectTagsUseCase: { execute: jest.Mock };
  let findTagByIdUseCase: { execute: jest.Mock };
  let updateTagUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createTagUseCase = { execute: jest.fn() };
    deleteTagUseCase = { execute: jest.fn() };
    findAllTagsUseCase = { execute: jest.fn() };
    findSelectTagsUseCase = { execute: jest.fn() };
    findTagByIdUseCase = { execute: jest.fn() };
    updateTagUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [
        { provide: CreateTagUseCase, useValue: createTagUseCase },
        { provide: DeleteTagUseCase, useValue: deleteTagUseCase },
        { provide: FindAllTagsUseCase, useValue: findAllTagsUseCase },
        { provide: FindSelectTagsUseCase, useValue: findSelectTagsUseCase },
        { provide: FindTagByIdUseCase, useValue: findTagByIdUseCase },
        { provide: UpdateTagUseCase, useValue: updateTagUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<TagController>(TagController);
  });

  it('deve delegar findAll', async () => {
    const filters = makeFindAllTagsFiltersDTO({ searchTerm: 'cam' });
    const payload = [makeTagEntity()];

    findAllTagsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findAll(organizationId, filters);

    expect(result).toBe(payload);
    expect(findAllTagsUseCase.execute).toHaveBeenCalledWith(
      organizationId,
      filters,
    );
  });

  it('deve delegar findAll sem filtros explícitos', async () => {
    const payload = [makeTagEntity()];

    findAllTagsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findAll(organizationId);

    expect(result).toBe(payload);
    expect(findAllTagsUseCase.execute).toHaveBeenCalledWith(organizationId, {});
  });

  it('deve delegar findSelect', async () => {
    const payload = [
      { id: 'tag-1', name: 'Campanha' },
      { id: 'tag-2', name: 'Institucional' },
    ];

    findSelectTagsUseCase.execute.mockResolvedValue(payload);

    const result = await controller.findSelect(organizationId);

    expect(result).toBe(payload);
    expect(findSelectTagsUseCase.execute).toHaveBeenCalledWith(organizationId);
  });

  it('deve delegar findById', async () => {
    const tag = makeTagEntity();
    findTagByIdUseCase.execute.mockResolvedValue(tag);

    await controller.findById(tag.id, organizationId);

    expect(findTagByIdUseCase.execute).toHaveBeenCalledWith(
      tag.id,
      organizationId,
    );
  });

  it('deve delegar create', async () => {
    const dto = makeCreateTagDTO();
    const created = makeTagEntity();

    createTagUseCase.execute.mockResolvedValue(created);

    await controller.create(organizationId, dto);

    expect(createTagUseCase.execute).toHaveBeenCalledWith(organizationId, dto);
  });

  it('deve delegar update', async () => {
    const dto = makeUpdateTagDTO({ name: 'Institucional' });
    updateTagUseCase.execute.mockResolvedValue(makeTagEntity(dto));

    await controller.update('tag-id', organizationId, dto);

    expect(updateTagUseCase.execute).toHaveBeenCalledWith(
      'tag-id',
      organizationId,
      dto,
    );
  });

  it('deve delegar delete', async () => {
    deleteTagUseCase.execute.mockResolvedValue(undefined);

    await controller.delete('tag-id', organizationId);

    expect(deleteTagUseCase.execute).toHaveBeenCalledWith(
      'tag-id',
      organizationId,
    );
  });
});
