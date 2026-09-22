import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { UpdateMaterialUseCase } from './update-material.use-case';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { ResolveMaterialTagIdsUseCase } from './resolve-material-tag-ids.use-case';
import {
  makeMaterialDetails,
  makeMaterialFile,
  makeUpdateMaterialDTO,
} from './test-helpers';

function makePngBuffer(): Buffer {
  const png = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
  png.writeUInt32BE(1080, 16);
  png.writeUInt32BE(1080, 20);
  return png;
}

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
      isActivePrintPreset: jest.fn(),
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
    storageService = {
      readFile: jest.fn().mockResolvedValue(makePngBuffer()),
    };

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
    const jpeg = Buffer.alloc(12);
    jpeg[0] = 0xff;
    jpeg[1] = 0xd8;
    jpeg[2] = 0xff;
    jpeg[3] = 0xc0;
    jpeg.writeUInt16BE(8, 4);
    jpeg[6] = 8;
    jpeg.writeUInt16BE(720, 7);
    jpeg.writeUInt16BE(1280, 9);

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      makeMaterialFile({
        id: 'base-file-id',
        materialId: material.id,
        fileKey: 'materials/material-id/base.png',
        mimeType: 'application/octet-stream',
        size: 24,
        sortOrder: 0,
      }),
      makeMaterialFile({
        id: 'second-file-id',
        materialId: material.id,
        fileKey: 'materials/material-id/second.jpg',
        mimeType: 'image/png',
        size: jpeg.length,
        sortOrder: 1,
      }),
    ]);
    storageService.readFile.mockResolvedValueOnce(makePngBuffer());
    storageService.readFile.mockResolvedValueOnce(jpeg);
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
        activateTemplate: {
          baseMaterialFileId: 'base-file-id',
          baseMimeType: 'image/png',
          validatedFiles: [
            {
              id: 'base-file-id',
              mimeType: 'image/png',
              width: 1080,
              height: 1080,
            },
            {
              id: 'second-file-id',
              mimeType: 'image/jpeg',
              width: 1280,
              height: 720,
            },
          ],
        },
      },
    );
    expect(storageService.readFile).toHaveBeenNthCalledWith(
      1,
      'materials/material-id/base.png',
    );
    expect(storageService.readFile).toHaveBeenNthCalledWith(
      2,
      'materials/material-id/second.jpg',
    );
  });

  it('deve impedir ativação sem imagens', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ isCustomizable: true });
    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.findFilesByMaterialId.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', dto, 'user-id'),
    ).rejects.toThrow(
      'Material customizável deve possuir de 1 a 20 imagens PNG ou JPEG',
    );

    expect(materialRepository.update).not.toHaveBeenCalled();
  });

  it('deve impedir ativação quando qualquer arquivo não for imagem real', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ isCustomizable: true });
    materialRepository.findFilesByMaterialId.mockResolvedValue([
      makeMaterialFile({
        id: 'pdf-file-id',
        materialId: material.id,
        fileKey: 'materials/material-id/falso.png',
        mimeType: 'image/png',
        size: 8,
      }),
    ]);
    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    storageService.readFile.mockResolvedValue(Buffer.from('%PDF-1.7'));

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('A imagem base deve ser PNG ou JPEG válido');

    expect(materialRepository.update).not.toHaveBeenCalled();
  });

  it('deve impedir ativação com mais de 20 arquivos', async () => {
    const material = makeMaterialDetails();
    const dto = makeUpdateMaterialDTO({ isCustomizable: true });
    materialRepository.findFilesByMaterialId.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) =>
        makeMaterialFile({ id: `file-${index}`, sortOrder: index }),
      ),
    );
    findMaterialByIdUseCase.execute.mockResolvedValue(material);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow(
      'Material customizável deve possuir de 1 a 20 imagens PNG ou JPEG',
    );

    expect(storageService.readFile).not.toHaveBeenCalled();
    expect(materialRepository.update).not.toHaveBeenCalled();
  });

  it('deve exigir preset quando o material customizável marcar PDF para impressão', async () => {
    const material = makeMaterialDetails({ isCustomizable: true });
    const dto = makeUpdateMaterialDTO({ exportTypes: ['print_pdf'] });
    findMaterialByIdUseCase.execute.mockResolvedValue(material);

    await expect(
      useCase.execute(material.id, 'org-id', dto, 'user-id'),
    ).rejects.toThrow('Selecione um preset de impressão');
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
