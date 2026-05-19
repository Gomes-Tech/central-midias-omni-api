import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindCategoryByIdUseCase } from '@modules/category';
import { MaterialRepository } from '../repository';
import { CreateMaterialUseCase } from './create-material.use-case';
import { makeCreateMaterialDTO, makeUploadFile } from './test-helpers';

describe('CreateMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findCategoryByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile'>
  >;
  let useCase: CreateMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findCategoryByIdUseCase = { execute: jest.fn() };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
    };

    useCase = new CreateMaterialUseCase(
      materialRepository,
      findCategoryByIdUseCase as unknown as FindCategoryByIdUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve criar um material quando categoria estiver ativa e nome livre', async () => {
    const dto = makeCreateMaterialDTO();
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
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
    expect(materialRepository.create).toHaveBeenCalledWith(
      'org-id',
      dto,
      'user-id',
      {
        id: 'mocked-uuid',
        files: [],
      },
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve criar material com upload de arquivos no mesmo fluxo', async () => {
    const dto = makeCreateMaterialDTO();
    const file = makeUploadFile({ size: 4096 });
    findCategoryByIdUseCase.execute.mockResolvedValue({
      id: dto.categoryId,
      isActive: true,
    });
    materialRepository.findByName.mockResolvedValue(null);
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
