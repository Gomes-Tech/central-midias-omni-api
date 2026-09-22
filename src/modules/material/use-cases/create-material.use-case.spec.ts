import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category';
import { EnqueueInAppNotificationsUseCase } from '@modules/notification/use-cases';
import { v4 as uuidv4 } from 'uuid';
import { MaterialRepository } from '../repository';
import { CreateMaterialUseCase } from './create-material.use-case';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { ResolveMaterialTagIdsUseCase } from './resolve-material-tag-ids.use-case';
import { makeCreateMaterialDTO, makeUploadFile } from './test-helpers';

describe('CreateMaterialUseCase', () => {
  const makePngFile = () => {
    const buffer = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
    buffer.writeUInt32BE(1080, 16);
    buffer.writeUInt32BE(1080, 20);
    return makeUploadFile({
      originalname: 'base.png',
      mimetype: 'image/png',
      size: buffer.length,
      buffer,
    });
  };
  const makeJpegFile = () => {
    const buffer = Buffer.alloc(12);
    buffer[0] = 0xff;
    buffer[1] = 0xd8;
    buffer[2] = 0xff;
    buffer[3] = 0xc0;
    buffer.writeUInt16BE(8, 4);
    buffer[6] = 8;
    buffer.writeUInt16BE(720, 7);
    buffer.writeUInt16BE(1280, 9);
    return makeUploadFile({
      originalname: 'base.jpg',
      mimetype: 'image/jpeg',
      size: buffer.length,
      buffer,
    });
  };
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let resolveMaterialTagIdsUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let enqueueMaterialAcceptanceEmailsUseCase: { execute: jest.Mock };
  let enqueueMaterialNotificationEmailsUseCase: { execute: jest.Mock };
  let enqueueInAppNotificationsUseCase: { execute: jest.Mock };
  let useCase: CreateMaterialUseCase;

  beforeEach(() => {
    (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid');
    materialRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
      isActivePrintPreset: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findCategoryByIdUseCase = { execute: jest.fn() };
    resolveMaterialTagIdsUseCase = { execute: jest.fn() };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };
    enqueueMaterialAcceptanceEmailsUseCase = {
      execute: jest.fn().mockResolvedValue({ enqueued: 1 }),
    };
    enqueueMaterialNotificationEmailsUseCase = {
      execute: jest.fn().mockResolvedValue({ enqueued: 1 }),
    };
    enqueueInAppNotificationsUseCase = {
      execute: jest.fn().mockResolvedValue({ enqueued: 1 }),
    };

    useCase = new CreateMaterialUseCase(
      materialRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      resolveMaterialTagIdsUseCase as unknown as ResolveMaterialTagIdsUseCase,
      storageService as unknown as StorageService,
      enqueueMaterialAcceptanceEmailsUseCase as unknown as EnqueueMaterialAcceptanceEmailsUseCase,
      enqueueMaterialNotificationEmailsUseCase as unknown as EnqueueMaterialNotificationEmailsUseCase,
      enqueueInAppNotificationsUseCase as unknown as EnqueueInAppNotificationsUseCase,
    );
  });

  it('deve criar um material quando categoria estiver ativa e nome livre', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toEqual({
      id: 'mocked-uuid',
    });

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      dto.categoryId,
      'org-id',
    );
    expect(materialRepository.findByName).toHaveBeenCalledWith(
      dto.name,
      dto.categoryId,
    );
    expect(resolveMaterialTagIdsUseCase.execute).toHaveBeenCalledWith(
      'org-id',
      dto.tags,
    );
    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      {
        id: 'mocked-uuid',
        files: [],
        tags: {
          existingTagIds: ['tag-id'],
          newTagNames: [],
        },
      },
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(
      enqueueMaterialAcceptanceEmailsUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(
      enqueueMaterialNotificationEmailsUseCase.execute,
    ).not.toHaveBeenCalled();
    expect(enqueueInAppNotificationsUseCase.execute).toHaveBeenCalledWith({
      materialId: 'mocked-uuid',
      organizationId: 'org-id',
      type: 'MATERIAL_CREATED',
      actorUserId: 'user-id',
    });
  });

  it('deve criar material personalizável com uma imagem base válida', async () => {
    const dto = makeCreateMaterialDTO({
      isCustomizable: true,
    });
    const file = makePngFile();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/base.png',
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).resolves.toEqual({ id: 'mocked-uuid' });

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        id: 'mocked-uuid',
        files: [
          expect.objectContaining({
            id: 'mocked-uuid',
            originalName: 'base.png',
            mimeType: 'image/png',
            width: 1080,
            height: 1080,
            sortOrder: 0,
          }),
        ],
      }),
    );
  });

  it('deve criar material personalizável com PNG e JPEG na ordem do lote', async () => {
    const dto = makeCreateMaterialDTO({ isCustomizable: true });
    const files = [makePngFile(), makePngFile(), makeJpegFile()];
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('material-id')
      .mockReturnValueOnce('file-id-1')
      .mockReturnValueOnce('file-id-2')
      .mockReturnValueOnce('file-id-3');
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    storageService.uploadFile
      .mockResolvedValueOnce({ path: 'materials/material-id/front.png' })
      .mockResolvedValueOnce({ path: 'materials/material-id/back.png' })
      .mockResolvedValueOnce({ path: 'materials/material-id/detail.jpg' });
    materialRepository.create.mockResolvedValue('material-id');

    await expect(
      useCase.execute('org-id', dto, 'user-id', files),
    ).resolves.toEqual({ id: 'material-id' });

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        id: 'material-id',
        files: [
          expect.objectContaining({
            id: 'file-id-1',
            mimeType: 'image/png',
            width: 1080,
            height: 1080,
            sortOrder: 0,
          }),
          expect.objectContaining({
            id: 'file-id-2',
            mimeType: 'image/png',
            sortOrder: 1,
          }),
          expect.objectContaining({
            id: 'file-id-3',
            mimeType: 'image/jpeg',
            width: 1280,
            height: 720,
            sortOrder: 2,
          }),
        ],
      }),
    );
  });

  it('deve exigir preset quando exportação for PDF para impressão', async () => {
    const dto = makeCreateMaterialDTO({
      isCustomizable: true,
      exportTypes: ['print_pdf'],
    });
    const file = makePngFile();

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).rejects.toThrow('Selecione um preset de impressão');
    expect(materialRepository.create).not.toHaveBeenCalled();
  });

  it('deve exigir ao menos uma imagem para material personalizável', async () => {
    const dto = makeCreateMaterialDTO({ isCustomizable: true });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Material customizável deve possuir de 1 a 20 imagens',
    );

    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
    expect(materialRepository.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar a 21ª imagem de material personalizável', async () => {
    const dto = makeCreateMaterialDTO({ isCustomizable: true });
    const files = Array.from({ length: 21 }, () => makePngFile());

    await expect(
      useCase.execute('org-id', dto, 'user-id', files),
    ).rejects.toThrow('Material customizável deve possuir de 1 a 20 imagens');

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(materialRepository.create).not.toHaveBeenCalled();
  });

  it('deve rejeitar PDF com MIME de imagem forjado', async () => {
    const dto = makeCreateMaterialDTO({ isCustomizable: true });
    const file = makeUploadFile({
      originalname: 'falso.png',
      mimetype: 'image/png',
      buffer: Buffer.from('%PDF-1.7'),
      size: 8,
    });

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).rejects.toThrow('A imagem base deve ser PNG ou JPEG válido');

    expect(storageService.uploadFile).not.toHaveBeenCalled();
    expect(materialRepository.create).not.toHaveBeenCalled();
  });

  it('deve disparar e-mail quando notifyUsers for true e sempre enfileirar inbox', async () => {
    const dto = makeCreateMaterialDTO({ notifyUsers: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await useCase.execute('org-id', dto, 'user-id');

    expect(
      enqueueMaterialNotificationEmailsUseCase.execute,
    ).toHaveBeenCalledWith('mocked-uuid', 'org-id', undefined);
    expect(enqueueInAppNotificationsUseCase.execute).toHaveBeenCalledWith({
      materialId: 'mocked-uuid',
      organizationId: 'org-id',
      type: 'MATERIAL_CREATED',
      actorUserId: 'user-id',
    });
  });

  it('não deve impedir criação quando enfileiramento de notificação falhar', async () => {
    const dto = makeCreateMaterialDTO({ notifyUsers: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');
    enqueueMaterialNotificationEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );
    enqueueInAppNotificationsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toEqual({
      id: 'mocked-uuid',
    });
  });

  it('deve disparar notificação quando requiresAcceptance for true', async () => {
    const dto = makeCreateMaterialDTO({ requiresAcceptance: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await useCase.execute('org-id', dto, 'user-id');

    expect(enqueueMaterialAcceptanceEmailsUseCase.execute).toHaveBeenCalledWith(
      'mocked-uuid',
      'org-id',
    );
  });

  it('não deve impedir criação quando enfileiramento de aceite falhar', async () => {
    const dto = makeCreateMaterialDTO({ requiresAcceptance: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');
    enqueueMaterialAcceptanceEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toEqual({
      id: 'mocked-uuid',
    });
  });

  it('deve usar mimeType e size padrão quando arquivo não informar metadados', async () => {
    const dto = makeCreateMaterialDTO();
    const file = makeUploadFile({
      mimetype: undefined as unknown as string,
      size: Number.NaN,
    });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/arquivo.bin',
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await useCase.execute('org-id', dto, 'user-id', [file]);

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        files: [
          expect.objectContaining({
            fileKey: 'materials/mocked-uuid/arquivo.bin',
            originalName: 'arquivo.pdf',
            mimeType: 'application/octet-stream',
            size: 0,
            sortOrder: 0,
          }),
        ],
      }),
    );
  });

  it('deve criar material com upload de arquivos no mesmo fluxo', async () => {
    const dto = makeCreateMaterialDTO();
    const file = makeUploadFile({ size: 4096 });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: ['Lancamento'],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/arquivo.pdf',
    });
    materialRepository.create.mockResolvedValue('mocked-uuid');

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).resolves.toEqual({ id: 'mocked-uuid' });

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      file,
      'materials/mocked-uuid',
    );
    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      {
        id: 'mocked-uuid',
        files: [
          {
            id: 'mocked-uuid',
            fileKey: 'materials/mocked-uuid/arquivo.pdf',
            originalName: 'arquivo.pdf',
            mimeType: 'application/pdf',
            size: 4096,
            width: undefined,
            height: undefined,
            sortOrder: 0,
          },
        ],
        tags: {
          existingTagIds: ['tag-id'],
          newTagNames: ['Lancamento'],
        },
      },
    );
  });

  it('deve atribuir id, nome, MIME e posição próprios para cada arquivo', async () => {
    const dto = makeCreateMaterialDTO();
    const pdf = makeUploadFile({
      originalname: '  documentos\\primeiro.pdf ',
      mimetype: 'application/pdf',
    });
    const image = makeUploadFile({
      originalname: 'segundo.png',
      mimetype: 'image/png',
    });
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('material-id')
      .mockReturnValueOnce('file-id-1')
      .mockReturnValueOnce('file-id-2');
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    storageService.uploadFile
      .mockResolvedValueOnce({ path: 'materials/material-id/first.pdf' })
      .mockResolvedValueOnce({ path: 'materials/material-id/second.png' });
    materialRepository.create.mockResolvedValue('material-id');

    await useCase.execute('org-id', dto, 'user-id', [pdf, image]);

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        id: 'material-id',
        files: [
          expect.objectContaining({
            id: 'file-id-1',
            originalName: 'primeiro.pdf',
            mimeType: 'application/pdf',
            sortOrder: 0,
          }),
          expect.objectContaining({
            id: 'file-id-2',
            originalName: 'segundo.png',
            mimeType: 'image/png',
            sortOrder: 1,
          }),
        ],
      }),
    );
  });

  it('deve remover arquivos enviados quando criação no banco falhar', async () => {
    const dto = makeCreateMaterialDTO();
    const file = makeUploadFile();
    const error = new Error('db');
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/arquivo.pdf',
    });
    materialRepository.create.mockRejectedValue(error);

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/mocked-uuid/arquivo.pdf',
    ]);
  });

  it('deve remover uploads parciais quando um envio falhar', async () => {
    const dto = makeCreateMaterialDTO();
    const firstFile = makeUploadFile({ originalname: 'a.pdf' });
    const secondFile = makeUploadFile({ originalname: 'b.pdf' });
    const error = new Error('s3');
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagIdsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
    storageService.uploadFile
      .mockResolvedValueOnce({ path: 'materials/mocked-uuid/a.pdf' })
      .mockRejectedValueOnce(error);

    await expect(
      useCase.execute('org-id', dto, 'user-id', [firstFile, secondFile]),
    ).rejects.toBe(error);

    expect(materialRepository.create).not.toHaveBeenCalled();
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/mocked-uuid/a.pdf',
    ]);
  });

  it('não deve fazer upload quando categoria estiver inativa', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: false,
    });

    await expect(
      useCase.execute('org-id', dto, 'user-id', [makeUploadFile()]),
    ).rejects.toThrow(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('não deve fazer upload quando nome estiver duplicado', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue({
      id: 'existing',
      name: dto.name,
      categoryId: dto.categoryId,
    });

    await expect(
      useCase.execute('org-id', dto, 'user-id', [makeUploadFile()]),
    ).rejects.toThrow('Já existe um material com este nome nesta categoria');
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve impedir criação em categoria inativa', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: false,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Categoria informada está inativa',
    );
  });

  it('deve impedir nome duplicado na mesma categoria', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue({
      id: 'existing',
      name: dto.name,
      categoryId: dto.categoryId,
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Já existe um material com este nome nesta categoria',
    );
  });
});
