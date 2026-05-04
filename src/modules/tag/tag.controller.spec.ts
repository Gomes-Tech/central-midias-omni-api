import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { TagController } from './tag.controller';
import {
  CreateTagUseCase,
  DeleteTagUseCase,
  FindAllTagsUseCase,
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
  let controller: TagController;
  let createTagUseCase: { execute: jest.Mock };
  let deleteTagUseCase: { execute: jest.Mock };
  let findAllTagsUseCase: { execute: jest.Mock };
  let findTagByIdUseCase: { execute: jest.Mock };
  let updateTagUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createTagUseCase = { execute: jest.fn() };
    deleteTagUseCase = { execute: jest.fn() };
    findAllTagsUseCase = { execute: jest.fn() };
    findTagByIdUseCase = { execute: jest.fn() };
    updateTagUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TagController],
      providers: [
        { provide: CreateTagUseCase, useValue: createTagUseCase },
        { provide: DeleteTagUseCase, useValue: deleteTagUseCase },
        { provide: FindAllTagsUseCase, useValue: findAllTagsUseCase },
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

    const result = await controller.findAll(filters);

    expect(result).toBe(payload);
    expect(findAllTagsUseCase.execute).toHaveBeenCalledWith(filters);
  });

  it('deve delegar findById', async () => {
    const tag = makeTagEntity();
    findTagByIdUseCase.execute.mockResolvedValue(tag);

    await controller.findById(tag.id);

    expect(findTagByIdUseCase.execute).toHaveBeenCalledWith(tag.id);
  });

  it('deve delegar create', async () => {
    const dto = makeCreateTagDTO();
    const created = makeTagEntity();

    createTagUseCase.execute.mockResolvedValue(created);

    await controller.create(dto);

    expect(createTagUseCase.execute).toHaveBeenCalledWith(dto);
  });

  it('deve delegar update', async () => {
    const dto = makeUpdateTagDTO({ name: 'Institucional' });
    updateTagUseCase.execute.mockResolvedValue(makeTagEntity(dto));

    await controller.update('tag-id', dto);

    expect(updateTagUseCase.execute).toHaveBeenCalledWith('tag-id', dto);
  });

  it('deve delegar delete', async () => {
    deleteTagUseCase.execute.mockResolvedValue(undefined);

    await controller.delete('tag-id');

    expect(deleteTagUseCase.execute).toHaveBeenCalledWith('tag-id');
  });
});
