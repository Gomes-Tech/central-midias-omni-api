import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { v4 as uuidv4 } from 'uuid';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialFile, makeUploadFile } from './test-helpers';
import { UploadMaterialFilesUseCase } from './upload-material-files.use-case';

function makePngFile(originalname = 'verso.png') {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
  buffer.writeUInt32BE(1200, 16);
  buffer.writeUInt32BE(800, 20);
  return makeUploadFile({
    originalname,
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
  });
}

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
      findCustomizableUploadContext: jest.fn(),
      addCustomizableFiles: jest.fn(),
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
      new MaterialTemplateDocumentService(),
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

  it('volta template V2 publicado a rascunho V3 ao incluir a segunda imagem', async () => {
    const file = makePngFile();
    const v2Document = {
      version: 2,
      canvas: { width: 1080, height: 1080 },
      layerOrder: ['text-1'],
      layers: [
        {
          id: 'text-1',
          type: 'text',
          name: 'Nome',
          x: 10,
          y: 20,
          rotation: 0,
          isVisible: true,
          editableProperties: ['content'],
          profileBinding: null,
          runs: [
            {
              text: 'Olá',
              fontSize: 32,
              fontFamily: 'Arial',
              fill: '#111111',
              bold: false,
              italic: false,
              underline: false,
            },
          ],
        },
      ],
    };
    (uuidv4 as jest.Mock).mockReturnValueOnce('file-id-2');
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 4,
      document: v2Document,
      printPresetId: null,
      files: [
        {
          id: 'file-id-1',
          width: 1080,
          height: 1080,
          sortOrder: 0,
        },
      ],
      activePrintExportCount: 0,
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/verso.png',
    });
    materialRepository.addCustomizableFiles.mockResolvedValue([
      makeMaterialFile({
        id: 'file-id-2',
        originalName: 'verso.png',
        mimeType: 'image/png',
        size: file.size,
        width: 1200,
        height: 800,
        sortOrder: 1,
      }),
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/verso.png');

    await expect(
      useCase.execute('material-id', 'org-id', [file], 'user-id'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'file-id-2',
        mimeType: 'image/png',
        url: 'https://cdn.test/verso.png',
      }),
    ]);

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/png' }),
      'materials/material-id',
    );
    expect(materialRepository.createFiles).not.toHaveBeenCalled();
    expect(materialRepository.addCustomizableFiles).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [
        {
          id: 'file-id-2',
          fileKey: 'materials/material-id/verso.png',
          originalName: 'verso.png',
          mimeType: 'image/png',
          size: file.size,
          width: 1200,
          height: 800,
          sortOrder: 0,
        },
      ],
      {
        templateId: 'template-id',
        revision: 4,
        existingFileIds: ['file-id-1'],
        document: {
          version: 3,
          pages: [
            {
              materialFileId: 'file-id-1',
              canvas: { width: 1080, height: 1080 },
              layerOrder: ['text-1'],
              layers: v2Document.layers,
            },
            {
              materialFileId: 'file-id-2',
              canvas: { width: 1200, height: 800 },
              layerOrder: [],
              layers: [],
            },
          ],
        },
      },
      'user-id',
    );
  });

  it('normaliza documento nulo para V3 com as imagens atuais e as novas', async () => {
    const file = makePngFile('extra.png');
    (uuidv4 as jest.Mock).mockReturnValueOnce('file-id-2');
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 0,
      document: null,
      printPresetId: null,
      files: [{ id: 'file-id-1', width: 640, height: 480, sortOrder: 0 }],
      activePrintExportCount: 0,
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/extra.png',
    });
    materialRepository.addCustomizableFiles.mockResolvedValue([
      makeMaterialFile({ id: 'file-id-2' }),
    ]);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/extra.png');

    await useCase.execute('material-id', 'org-id', [file], 'user-id');

    expect(materialRepository.addCustomizableFiles).toHaveBeenCalledWith(
      'material-id',
      'org-id',
      [expect.objectContaining({ id: 'file-id-2', sortOrder: 0 })],
      expect.objectContaining({
        document: {
          version: 3,
          pages: [
            {
              materialFileId: 'file-id-1',
              canvas: { width: 640, height: 480 },
              layerOrder: [],
              layers: [],
            },
            {
              materialFileId: 'file-id-2',
              canvas: { width: 1200, height: 800 },
              layerOrder: [],
              layers: [],
            },
          ],
        },
      }),
      'user-id',
    );
  });

  it('recusa a 21ª imagem e PDF de material customizável antes do upload', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 1,
      document: null,
      printPresetId: null,
      files: Array.from({ length: 20 }, (_, index) => ({
        id: `file-${index}`,
        width: 100,
        height: 100,
        sortOrder: index,
      })),
      activePrintExportCount: 0,
    });

    await expect(
      useCase.execute('material-id', 'org-id', [makePngFile()], 'user-id'),
    ).rejects.toThrow('Material customizável deve possuir de 1 a 20 imagens');
    expect(storageService.uploadFile).not.toHaveBeenCalled();

    await expect(
      useCase.execute('material-id', 'org-id', [makeUploadFile()], 'user-id'),
    ).rejects.toThrow('A imagem base deve ser PNG ou JPEG válido');
    expect(
      materialRepository.findCustomizableUploadContext,
    ).toHaveBeenCalledTimes(1);
  });

  it('recusa inclusão quando há exportação de impressão em andamento', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 1,
      document: null,
      printPresetId: null,
      files: [{ id: 'file-id-1', width: 100, height: 100, sortOrder: 0 }],
      activePrintExportCount: 1,
    });

    await expect(
      useCase.execute('material-id', 'org-id', [makePngFile()], 'user-id'),
    ).rejects.toThrow(
      'Não é possível incluir imagens enquanto houver uma exportação de impressão em andamento',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('remove só o upload novo se a transação do material customizável falhar', async () => {
    const error = new Error('db');
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 1,
      document: null,
      printPresetId: null,
      files: [{ id: 'file-id-1', width: 100, height: 100, sortOrder: 0 }],
      activePrintExportCount: 0,
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/verso.png',
    });
    materialRepository.addCustomizableFiles.mockRejectedValue(error);

    await expect(
      useCase.execute('material-id', 'org-id', [makePngFile()], 'user-id'),
    ).rejects.toBe(error);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/verso.png',
    ]);
  });

  it('exige template quando o material customizável não tem um', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue(null);

    await expect(
      useCase.execute('material-id', 'org-id', [makePngFile()], 'user-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });
});
