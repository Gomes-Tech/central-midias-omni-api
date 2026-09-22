import { BadRequestException, NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { ReplaceMaterialFileUseCase } from './replace-material-file.use-case';
import { makeMaterialFile, makeUploadFile } from './test-helpers';

function makePngFile(
  originalname = 'nova.png',
  width = 400,
  height = 180,
): Express.Multer.File {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return makeUploadFile({
    originalname,
    mimetype: 'image/png',
    size: buffer.length,
    buffer,
  });
}

const textLayer = {
  id: 'text-1',
  type: 'text' as const,
  name: 'Nome',
  runs: [
    {
      text: 'Olá',
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#111111',
      bold: false,
      italic: false,
      underline: false,
    },
  ],
  x: 10,
  y: 20,
  rotation: 0,
  isVisible: true,
  editableProperties: ['content'] as ['content'],
  profileBinding: null,
};

const v3Document = {
  version: 3 as const,
  pages: [
    {
      materialFileId: 'file-1',
      canvas: { width: 100, height: 80 },
      layerOrder: ['text-1'],
      layers: [textLayer],
    },
    {
      materialFileId: 'file-2',
      canvas: { width: 200, height: 90 },
      layerOrder: [],
      layers: [],
    },
  ],
};

const customizableFiles = [
  { id: 'file-1', width: 100, height: 80, sortOrder: 0 },
  { id: 'file-2', width: 200, height: 90, sortOrder: 2 },
];

describe('ReplaceMaterialFileUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findMaterialByIdUseCase: { execute: jest.Mock };
  let storageService: jest.Mocked<
    Pick<StorageService, 'uploadFile' | 'deleteFile' | 'getPublicUrl'>
  >;
  let useCase: ReplaceMaterialFileUseCase;

  beforeEach(() => {
    materialRepository = {
      findCustomizableUploadContext: jest.fn(),
      replaceCustomizableFile: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    findMaterialByIdUseCase = { execute: jest.fn() };
    storageService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn(),
      getPublicUrl: jest.fn(),
    };
    storageService.deleteFile.mockResolvedValue(undefined);

    useCase = new ReplaceMaterialFileUseCase(
      materialRepository,
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      storageService as unknown as StorageService,
      new MaterialTemplateDocumentService(),
    );
  });

  function mockCustomizable(overrides: Record<string, unknown> = {}) {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue({
      templateId: 'template-id',
      revision: 4,
      document: v3Document,
      printPresetId: null,
      files: customizableFiles,
      activePrintExportCount: 0,
      ...overrides,
    });
    storageService.uploadFile.mockResolvedValue({
      path: 'materials/material-id/novo.png',
    });
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/novo.png');
    materialRepository.replaceCustomizableFile.mockResolvedValue({
      file: makeMaterialFile({
        id: 'file-2',
        fileKey: 'materials/material-id/novo.png',
        originalName: 'nova.png',
        mimeType: 'image/png',
        size: 24,
        width: 400,
        height: 180,
        sortOrder: 2,
      }),
      previousFileKey: 'materials/material-id/antigo.png',
    });
  }

  it('sem preset escala só a página substituída e apaga o objeto antigo', async () => {
    const file = makePngFile();
    mockCustomizable();

    await expect(
      useCase.execute('material-id', 'file-2', 'org-id', [file], 'user-id'),
    ).resolves.toEqual({
      id: 'file-2',
      materialId: 'material-id',
      originalName: 'nova.png',
      mimeType: 'image/png',
      size: 24,
      width: 400,
      height: 180,
      sortOrder: 2,
      url: 'https://cdn.test/novo.png',
    });

    expect(storageService.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({ mimetype: 'image/png' }),
      'materials/material-id',
    );
    expect(materialRepository.replaceCustomizableFile).toHaveBeenCalledWith(
      'material-id',
      'file-2',
      'org-id',
      {
        templateId: 'template-id',
        revision: 4,
        fileKey: 'materials/material-id/novo.png',
        originalName: 'nova.png',
        mimeType: 'image/png',
        size: file.size,
        width: 400,
        height: 180,
        document: {
          version: 3,
          pages: [
            v3Document.pages[0],
            {
              materialFileId: 'file-2',
              canvas: { width: 400, height: 180 },
              layerOrder: [],
              layers: [],
            },
          ],
        },
      },
      'user-id',
    );
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/antigo.png',
    ]);
  });

  it('com preset mantém o canvas da página e não escala o documento', async () => {
    mockCustomizable({ printPresetId: 'preset-id' });

    await useCase.execute(
      'material-id',
      'file-2',
      'org-id',
      [makePngFile()],
      'user-id',
    );

    const [, , , options] =
      materialRepository.replaceCustomizableFile.mock.calls[0];
    expect(options.document).toEqual(v3Document);
  });

  it('mantém o documento nulo quando não há documento para escalar', async () => {
    mockCustomizable({ document: null });

    await useCase.execute(
      'material-id',
      'file-2',
      'org-id',
      [makePngFile()],
      'user-id',
    );

    expect(materialRepository.replaceCustomizableFile).toHaveBeenCalledWith(
      'material-id',
      'file-2',
      'org-id',
      expect.objectContaining({ document: null }),
      'user-id',
    );
  });

  it('recusa material não customizável antes do upload', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: false,
    });

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('exige exatamente uma imagem enviada', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });

    await expect(
      useCase.execute('material-id', 'file-2', 'org-id', [], 'user-id'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile('a.png'), makePngFile('b.png')],
        'user-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('recusa imagem que não seja PNG ou JPEG', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makeUploadFile()],
        'user-id',
      ),
    ).rejects.toThrow('A imagem base deve ser PNG ou JPEG válido');
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('recusa substituição quando há exportação de impressão em andamento', async () => {
    mockCustomizable({ activePrintExportCount: 1 });

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toThrow(
      'Não é possível substituir imagens enquanto houver uma exportação de impressão em andamento',
    );
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('recusa arquivo que não pertence ao material', async () => {
    mockCustomizable();

    await expect(
      useCase.execute(
        'material-id',
        'file-inexistente',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('exige template quando o material customizável não tem um', async () => {
    findMaterialByIdUseCase.execute.mockResolvedValue({
      id: 'material-id',
      isCustomizable: true,
    });
    materialRepository.findCustomizableUploadContext.mockResolvedValue(null);

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it('remove só o upload novo quando a transação falha e mantém o objeto antigo', async () => {
    const error = new Error('db');
    mockCustomizable();
    materialRepository.replaceCustomizableFile.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toBe(error);
    expect(storageService.deleteFile).toHaveBeenCalledTimes(1);
    expect(storageService.deleteFile).toHaveBeenCalledWith([
      'materials/material-id/novo.png',
    ]);
  });

  it('não apaga o upload persistido quando apenas a URL falhar', async () => {
    const error = new Error('signed-url');
    mockCustomizable();
    storageService.getPublicUrl.mockRejectedValue(error);

    await expect(
      useCase.execute(
        'material-id',
        'file-2',
        'org-id',
        [makePngFile()],
        'user-id',
      ),
    ).rejects.toBe(error);
    expect(storageService.deleteFile).not.toHaveBeenCalledWith([
      'materials/material-id/novo.png',
    ]);
  });
});
