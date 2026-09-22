import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { v4 as uuidv4 } from 'uuid';
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
    (uuidv4 as jest.Mock).mockReturnValue('mocked-uuid');
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
          id: 'mocked-uuid',
          fileKey: 'materials/material-id/file.bin',
          originalName: 'arquivo.pdf',
          mimeType: 'application/octet-stream',
          size: 0,
          sortOrder: 0,
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
        originalName: 'arquivo.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        width: null,
        height: null,
        sortOrder: 0,
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
          id: 'mocked-uuid',
          fileKey: 'materials/material-id/file.pdf',
          originalName: 'arquivo.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          sortOrder: 0,
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

  it('deve atribuir ids próprios, nomes normalizados e ordem do lote', async () => {
    const firstFile = makeUploadFile({
      originalname: '  pasta\\primeiro.pdf  ',
    });
    const secondFile = makeUploadFile({ originalname: 'segundo.pdf' });
    (uuidv4 as jest.Mock)
      .mockReturnValueOnce('file-id-1')
      .mockReturnValueOnce('file-id-2');

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile
      .mockResolvedValueOnce({ path: 'materials/material-id/first.pdf' })
      .mockResolvedValueOnce({ path: 'materials/material-id/second.pdf' });
    materialRepository.createFiles.mockResolvedValue([
      makeMaterialFile({ id: 'file-id-1', originalName: 'primeiro.pdf' }),
      makeMaterialFile({
        id: 'file-id-2',
        originalName: 'segundo.pdf',
        sortOrder: 1,
      }),
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/file');

    await useCase.execute(
      'material-id',
      'org-id',
      [firstFile, secondFile],
      'user-id',
    );

    expect(materialRepository.createFiles).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [
        expect.objectContaining({
          id: 'file-id-1',
          originalName: 'primeiro.pdf',
          sortOrder: 0,
        }),
        expect.objectContaining({
          id: 'file-id-2',
          originalName: 'segundo.pdf',
          sortOrder: 1,
        }),
      ],
      'user-id',
    );
  });

  it('não apaga objetos persistidos quando apenas a geração da URL falhar', async () => {
    const file = makeUploadFile();
    const error = new Error('signed-url');

    findMaterialByIdUseCase.execute.mockResolvedValue({ id: 'material-id' });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/file.pdf',
    });
    materialRepository.createFiles.mockResolvedValue([makeMaterialFile()]);
    storageService.getPublicUrl.mockRejectedValue(error);

    await expect(
      useCase.execute('material-id', 'org-id', [file], 'user-id'),
    ).rejects.toBe(error);

    expect(storageService.deleteFile).not.toHaveBeenCalled();
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
