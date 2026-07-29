import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { UpdateMaterialUseCase } from './update-material.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { ResolveMaterialTagIdsUseCase } from './resolve-material-tag-ids.use-case';
import { makeMaterialDetails, makeUpdateMaterialDTO } from './test-helpers';

describe('UpdateMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let resolveMaterialTagIdsUseCase: { execute: jest.Mock };
  let enqueueMaterialAcceptanceEmailsUseCase: { execute: jest.Mock };
  let enqueueMaterialNotificationEmailsUseCase: { execute: jest.Mock };
  let storageService: { readFile: jest.Mock };
  let useCase: UpdateMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findByName: jest.fn(),
      findFilesByMaterialId: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findMaterialByIdUseCase = { execute: jest.fn() };
    findCategoryByIdUseCase = { execute: jest.fn() };
    resolveMaterialTagIdsUseCase = { execute: jest.fn() };
    enqueueMaterialAcceptanceEmailsUseCase = {
      execute: jest.fn().mockResolvedValue({ enqueued: 1 }),
    };
    enqueueMaterialNotificationEmailsUseCase = {
      execute: jest.fn().mockResolvedValue({ enqueued: 1 }),
    };
    const png = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.writeUInt32BE(1080, 16);
    png.writeUInt32BE(1080, 20);
    storageService = { readFile: jest.fn().mockResolvedValue(png) };

    useCase = new UpdateMaterialUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      resolveMaterialTagIdsUseCase as unknown as ResolveMaterialTagIdsUseCase,
      storageService as unknown as StorageService,
      enqueueMaterialAcceptanceEmailsUseCase as unknown as EnqueueMaterialAcceptanceEmailsUseCase,
      enqueueMaterialNotificationEmailsUseCase as unknown as EnqueueMaterialNotificationEmailsUseCase,
    );
  });

  it('deve atualizar sem validar categoria nova quando ela não mudou', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ description: 'Novo texto' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBe(undefined);

    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
    expect(materialRepository.findByName).not.toHaveBeenCalled();
    expect(materialRepository.update).toHaveBeenCalledWith(
      material.id,
      'org-id',
      dto,
      'user-id',
      {
        tags: undefined,
      },
    );
  });

  it('deve validar categoria e nome quando houver mudança de escopo', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({
      name: 'Novo nome',
      categoryId: 'other-category',
    });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
    materialRepository.update.mockResolvedValue(undefined);

    await useCase.execute(material.id, 'org-id', dto, 'user-id');

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      dto.categoryId,
      'org-id',
    );
    expect(materialRepository.findByName).toHaveBeenCalledWith(
      'Novo nome',
      'other-category',
    );
    expect(resolveMaterialTagIdsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      dto.tags,
    );
  });

  it('deve impedir mover para categoria inativa', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ categoryId: 'other-category' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: false,
    });

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('Categoria informada está inativa');
  });

  it('deve impedir duplicidade de nome na categoria alvo', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ name: 'Duplicado' });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findByName.mockResolvedValue({
      id: 'another-material',
      name: 'Duplicado',
      categoryId: material.categoryId,
    });

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('Já existe um material com este nome nesta categoria');
  });

  it('deve sincronizar tags quando forem informadas', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ tags: ['tag-id', 'tag-id-2'] });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id', 'tag-id-2'],
      newTagNames: [],
    });
    materialRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBe(undefined);

    expect(materialRepository.update).toHaveBeenCalledWith(
      material.id,
      'org-id',
      dto,
      'user-id',
      {
        tags: {
          existingTagIds: ['tag-id', 'tag-id-2'],
          newTagNames: [],
        },
      },
    );
  });

  it('deve criar ou recuperar o template ao ativar a personalização', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ isCustomizable: true });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      {
        id: 'base-file-id',
        materialId: material.id,
        fileKey: 'materials/material-id/base.png',
        mimeType: 'image/png',
        size: 1024,
      },
    ]);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBe(undefined);

    expect(materialRepository.update).toHaveBeenCalledWith(
      material.id,
      'org-id',
      dto,
      'user-id',
      {
        tags: undefined,
        activateTemplate: { baseMaterialFileId: 'base-file-id' },
      },
    );
    expect(storageService.readFile).toHaveBeenCalledWith(
      'materials/material-id/base.png',
    );
  });

  it('deve impedir ativação sem exatamente uma imagem PNG ou JPEG', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ isCustomizable: true });
    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findFilesByMaterialId.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', dto, 'user-id'),
    ).rejects.toThrow(
      'Material customizável deve possuir exatamente uma imagem PNG ou JPEG',
    );

    expect(materialRepository.update).not.toHaveBeenCalled();
  });

  it('deve disparar notificação ao ativar requiresAcceptance na atualização', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: false });
    const dto = makeUpdateMaterialDTO({ requiresAcceptance: true });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);

    await useCase.execute(material.id, 'org-id', dto, 'user-id');

    expect(enqueueMaterialAcceptanceEmailsUseCase.execute).toHaveBeenCalledWith(
      material.id,
      'org-id',
    );
  });

  it('não deve impedir atualização quando enfileiramento de aceite falhar', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: false });
    const dto = makeUpdateMaterialDTO({ requiresAcceptance: true });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);
    enqueueMaterialAcceptanceEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();
  });

  it('deve notificar usuários quando notifyUsers for true', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ notifyUsers: true });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);

    await useCase.execute(material.id, 'org-id', dto, 'user-id');

    expect(
      enqueueMaterialNotificationEmailsUseCase.execute,
    ).toHaveBeenCalledWith(material.id, 'org-id', undefined);
  });

  it('não deve notificar usuários quando notifyUsers não for true', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ notifyUsers: false });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);

    await useCase.execute(material.id, 'org-id', dto, 'user-id');

    expect(
      enqueueMaterialNotificationEmailsUseCase.execute,
    ).not.toHaveBeenCalled();
  });

  it('não deve impedir atualização quando enfileiramento da notificação falhar', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ notifyUsers: true });

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue(undefined);
    materialRepository.update.mockResolvedValue(undefined);
    enqueueMaterialNotificationEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).resolves.toBeUndefined();
  });
});
