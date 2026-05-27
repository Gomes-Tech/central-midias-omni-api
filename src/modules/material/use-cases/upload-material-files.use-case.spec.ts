import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialFile, makeUploadFile } from './test-helpers';
import { UploadMaterialFilesUseCase } from './upload-material-files.use-case';

describe('UploadMaterialFilesUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile' | 'getPublicUrl'>
  >;
  let useCase: UploadMaterialFilesUseCase;

  beforeEach(() => {
    materialRepository = {
      createFiles: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    useCase = new UploadMaterialFilesUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
    );
  });

  it('deve usar mimeType e size padrão quando arquivo não informar metadados', async () => {
    const file = makeUploadFile({
      mimetype: undefined as unknown as string,
      size: Number.NaN,
    });

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/file.bin',
    });
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/file.bin');
    materialRepository.createFiles.mockResolvedValue([
      makeMaterialFile({
        mimeType: 'application/octet-stream',
        size: 0,
      }),
    ]);

    await useCase.execute('material-id', 'org-id', [file], 'user-id');

    expect(materialRepository.createFiles).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [
        {
          fileKey: 'materials/material-id/file.bin',
          mimeType: 'application/octet-stream',
          size: 0,
        },
      ],
      'user-id',
    );
  });

  it('deve fazer upload na pasta do material e persistir metadados', async () => {
    const file = makeUploadFile({ size: 2048 });
    const materialFile = makeMaterialFile({ size: 2048 });

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/file.pdf',
    });
    storageService.getPublicUrl.mockResolvedValue(
      'https://cdn.test/materials/material-id/file.pdf',
    );
    materialRepository.createFiles.mockResolvedValue([materialFile]);

    await expect(
      useCase.execute('material-id', 'org-id', [file], 'user-id'),
    ).resolves.toEqual([
      {
        id: 'material-file-id',
        materialId: 'material-id',
        mimeType: 'application/pdf',
        size: 2048,
        url: 'https://cdn.test/materials/material-id/file.pdf',
      },
    ]);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      'material-id',
      'org-id',
    );
    expect(storageService.uploadFile).toHaveBeenCalledWith(
      file,
      'materials/material-id',
    );
    expect(materialRepository.createFiles).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [
        {
          fileKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 2048,
        },
      ],
      'user-id',
    );
    expect(storageService.getPublicUrl).toHaveBeenCalledWith(
      'materials/material-id/file.pdf',
    );
  });

  it('deve exigir ao menos um arquivo', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });

    await expect(
      useCase.execute('material-id', 'org-id', [], 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('deve remover arquivos enviados se persistência falhar', async () => {
    const file = makeUploadFile();
    const error = new Error('db');

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/file.pdf',
    });
    materialRepository.createFiles.mockRejectedValue(error);

    await expect(
      useCase.execute('material-id', 'org-id', [file], 'user-id'),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/file.pdf',
    ]);
  });

  it('deve remover uploads parciais quando um envio falhar', async () => {
    const firstFile = makeUploadFile({ originalname: 'a.pdf' });
    const secondFile = makeUploadFile({ originalname: 'b.pdf' });
    const error = new Error('s3');

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile
      .mockResolvedValueOnce({ path: 'materials/material-id/a.pdf' })
      .mockRejectedValueOnce(error);

    await expect(
      useCase.execute(
        'material-id',
        'org-id',
        [firstFile, secondFile],
        'user-id',
      ),
    ).rejects.toBe(error);

    expect(materialRepository.createFiles).not.toHaveBeenCalled();
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/a.pdf',
    ]);
  });
});
