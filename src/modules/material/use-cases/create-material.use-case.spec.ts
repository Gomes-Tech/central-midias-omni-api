import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { CreateMaterialUseCase } from './create-material.use-case';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { ResolveMaterialTagsUseCase } from './resolve-material-tags.use-case';
import { makeCreateMaterialDTO, makeUploadFile } from './test-helpers';

describe('CreateMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let resolveMaterialTagsUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let enqueueMaterialAcceptanceEmailsUseCase: { execute: jest.Mock };
  let enqueueMaterialNotificationEmailsUseCase: { execute: jest.Mock };
  let useCase: CreateMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findCategoryByIdUseCase = { execute: jest.fn() };
    resolveMaterialTagsUseCase = { execute: jest.fn() };
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

    useCase = new CreateMaterialUseCase(
      materialRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      resolveMaterialTagsUseCase as unknown as ResolveMaterialTagsUseCase,
      storageService as unknown as StorageService,
      enqueueMaterialAcceptanceEmailsUseCase as unknown as EnqueueMaterialAcceptanceEmailsUseCase,
      enqueueMaterialNotificationEmailsUseCase as unknown as EnqueueMaterialNotificationEmailsUseCase,
    );
  });

  it('deve criar um material quando categoria estiver ativa e nome livre', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toBe(
      undefined,
    );

    expect(findCategoryByIdUseCase.execute).toHaveBeenCalledWith(
      dto.categoryId,
      'org-id',
    );
    expect(materialRepository.findByName).toHaveBeenCalledWith(
      dto.name,
      dto.categoryId,
    );
    expect(resolveMaterialTagsUseCase.execute).toHaveBeenCalledWith(
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
    expect(enqueueMaterialAcceptanceEmailsUseCase.execute).not.toHaveBeenCalled();
    expect(enqueueMaterialNotificationEmailsUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve criar material personalizável com configuração', async () => {
    const dto = makeCreateMaterialDTO({
      isCustomizable: true,
      customization: {
        position: 'TOP',
        hasPhonePrimary: true,
      },
    });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toBe(
      undefined,
    );

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        id: 'mocked-uuid',
      }),
    );
  });

  it('deve impedir customização sem isCustomizable true', async () => {
    const dto = makeCreateMaterialDTO({
      customization: {
        hasPhonePrimary: true,
      },
    });

    await expect(useCase.execute('org-id', dto, 'user-id')).rejects.toThrow(
      'Customização só pode ser informada para materiais personalizáveis',
    );

    expect(findCategoryByIdUseCase.execute).not.toHaveBeenCalled();
    expect(materialRepository.create).not.toHaveBeenCalled();
  });

  it('deve disparar notificação quando notifyUsers for true', async () => {
    const dto = makeCreateMaterialDTO({ notifyUsers: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);

    await useCase.execute('org-id', dto, 'user-id');

    expect(enqueueMaterialNotificationEmailsUseCase.execute).toHaveBeenCalledWith(
      'mocked-uuid',
      'org-id',
    );
  });

  it('não deve impedir criação quando enfileiramento de notificação falhar', async () => {
    const dto = makeCreateMaterialDTO({ notifyUsers: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);
    enqueueMaterialNotificationEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toBe(
      undefined,
    );
  });

  it('deve disparar notificação quando requiresAcceptance for true', async () => {
    const dto = makeCreateMaterialDTO({ requiresAcceptance: true });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);

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
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    materialRepository.create.mockResolvedValue(undefined);
    enqueueMaterialAcceptanceEmailsUseCase.execute.mockRejectedValue(
      new Error('queue'),
    );

    await expect(useCase.execute('org-id', dto, 'user-id')).resolves.toBe(
      undefined,
    );
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
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: [],
      newTagNames: [],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/arquivo.bin',
    });
    materialRepository.create.mockResolvedValue(undefined);

    await useCase.execute('org-id', dto, 'user-id', [file]);

    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      expect.objectContaining({
        files: [
          {
            fileKey: 'materials/mocked-uuid/arquivo.bin',
            mimeType: 'application/octet-stream',
            size: 0,
          },
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
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
      existingTagIds: ['tag-id'],
      newTagNames: ['Lancamento'],
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/mocked-uuid/arquivo.pdf',
    });
    materialRepository.create.mockResolvedValue(undefined);

    await expect(
      useCase.execute('org-id', dto, 'user-id', [file]),
    ).resolves.toBe(undefined);

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
            fileKey: 'materials/mocked-uuid/arquivo.pdf',
            mimeType: 'application/pdf',
            size: 4096,
          },
        ],
        tags: {
          existingTagIds: ['tag-id'],
          newTagNames: ['Lancamento'],
        },
      },
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
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
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
    resolveMaterialTagsUseCase.execute.mockResolvedValue({
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
