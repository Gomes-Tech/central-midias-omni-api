import { StorageService } from '@infrastructure/providers';
import { PrintPreflightService } from '@modules/print/services/print-preflight.service';
import {
  MaterialTemplateDocumentV1,
  MaterialTemplateDocumentV3,
} from '../entities';
import { MaterialTemplateRepository } from '../repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from '../services';
import { PublishMaterialTemplateUseCase } from './publish-material-template.use-case';
import { placeholderDocument } from '../../../test-utils/print-image-fixtures';

const document: MaterialTemplateDocumentV1 = {
  version: 1,
  canvas: { width: 1080, height: 1080 },
  layerOrder: ['asset', 'text'],
  layers: [
    {
      id: 'asset',
      type: 'asset',
      name: 'Logo',
      assetId: 'asset-id',
      x: 10,
      y: 20,
      width: 100,
      height: 100,
      rotation: 0,
      isVisible: true,
      editableProperties: [],
    },
    {
      id: 'text',
      type: 'text',
      name: 'Nome',
      value: 'Nome',
      x: 10,
      y: 20,
      rotation: 0,
      fontSize: 32,
      fontFamily: 'Arial',
      fill: '#111111',
      isVisible: true,
      editableProperties: ['value'],
      profileBinding: 'NAME',
    },
  ],
};

const baseFile = {
  id: 'file-id',
  imageKey: 'materials/material-id/base.png',
  size: 1024,
  mimeType: 'image/png',
  sortOrder: 0,
};

const template = {
  id: 'template-id',
  organizationId: 'org-id',
  materialId: 'material-id',
  document,
  baseFile,
  printPresetId: null,
  material: {
    isCustomizable: true,
    materialFiles: [baseFile],
  },
};

describe('PublishMaterialTemplateUseCase', () => {
  let repository: jest.Mocked<MaterialTemplateRepository>;
  let responseService: { resolve: jest.Mock };
  let imageService: { validate: jest.Mock };
  let storageService: { readFile: jest.Mock };
  let useCase: PublishMaterialTemplateUseCase;

  beforeEach(() => {
    repository = {
      findOrThrow: jest.fn().mockResolvedValue(template),
      assertMaterialCanPublish: jest.fn(),
      findAssets: jest.fn().mockResolvedValue([{ id: 'asset-id' }]),
      publish: jest
        .fn()
        .mockResolvedValue({ ...template, status: 'PUBLISHED' }),
    } as unknown as jest.Mocked<MaterialTemplateRepository>;
    responseService = { resolve: jest.fn().mockResolvedValue({ ok: true }) };
    imageService = { validate: jest.fn() };
    storageService = { readFile: jest.fn().mockResolvedValue(Buffer.alloc(1)) };
    useCase = new PublishMaterialTemplateUseCase(
      repository,
      new MaterialTemplateDocumentService(),
      imageService as unknown as MaterialTemplateImageService,
      responseService as unknown as MaterialTemplateResponseService,
      storageService as unknown as StorageService,
    );
  });

  it('publica somente a revisão validada com assets existentes', async () => {
    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).resolves.toEqual({ ok: true });
    expect(storageService.readFile).toHaveBeenCalledWith(
      'materials/material-id/base.png',
    );
    expect(imageService.validate).toHaveBeenCalledWith({
      buffer: expect.any(Buffer),
      size: 1024,
    });
    expect(repository.publish).toHaveBeenCalledWith(template, 7, 'user-id');
  });

  it('bloqueia publicação quando o documento não foi salvo', async () => {
    repository.findOrThrow.mockResolvedValue({
      ...template,
      document: null,
    } as never);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).rejects.toThrow('Salve o template antes de publicar');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('publica template apenas com imagem de fundo, sem texto ou marcador', async () => {
    repository.findOrThrow.mockResolvedValue({
      ...template,
      document: {
        ...document,
        layers: document.layers.map((layer) =>
          layer.type === 'text'
            ? { ...layer, editableProperties: [], profileBinding: null }
            : layer,
        ),
      },
    } as never);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).resolves.toEqual({ ok: true });
    expect(repository.publish).toHaveBeenCalled();
  });

  it('bloqueia publicação com dependência ausente', async () => {
    repository.findAssets.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).rejects.toThrow('Substitua os assets ausentes');
  });

  it('publica um template cuja única personalização é imagem', async () => {
    repository.findOrThrow.mockResolvedValue({
      ...template,
      document: placeholderDocument,
    } as never);
    repository.findAssets.mockResolvedValue([]);
    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).resolves.toEqual({ ok: true });
    expect(repository.findAssets).toHaveBeenCalledWith([], 'org-id');
    expect(repository.publish).toHaveBeenCalled();
  });

  it('recusa publicar quando uma página aponta para arquivo inexistente', async () => {
    const secondFile = {
      id: 'file-two',
      imageKey: 'materials/material-id/two.png',
      size: 2048,
      mimeType: 'image/png',
      sortOrder: 1,
    };
    const multipageDocument: MaterialTemplateDocumentV3 = {
      version: 3,
      pages: [
        {
          materialFileId: 'file-id',
          canvas: { width: 1080, height: 1080 },
          layerOrder: [],
          layers: [],
        },
        {
          materialFileId: 'arquivo-inexistente',
          canvas: { width: 1080, height: 1080 },
          layerOrder: [],
          layers: [],
        },
      ],
    };
    repository.findOrThrow.mockResolvedValue({
      ...template,
      document: multipageDocument,
      material: {
        isCustomizable: true,
        materialFiles: [baseFile, secondFile],
      },
    } as never);
    repository.findAssets.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).rejects.toThrow('não correspondem às imagens atuais');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('valida a imagem de cada página do documento', async () => {
    const secondFile = {
      id: 'file-two',
      imageKey: 'materials/material-id/two.png',
      size: 2048,
      mimeType: 'image/png',
      sortOrder: 1,
    };
    const multipageDocument: MaterialTemplateDocumentV3 = {
      version: 3,
      pages: [
        {
          materialFileId: 'file-id',
          canvas: { width: 1080, height: 1080 },
          layerOrder: [],
          layers: [],
        },
        {
          materialFileId: 'file-two',
          canvas: { width: 1080, height: 1080 },
          layerOrder: [],
          layers: [],
        },
      ],
    };
    repository.findOrThrow.mockResolvedValue({
      ...template,
      document: multipageDocument,
      material: {
        isCustomizable: true,
        materialFiles: [baseFile, secondFile],
      },
    } as never);
    repository.findAssets.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).resolves.toEqual({ ok: true });
    expect(storageService.readFile).toHaveBeenCalledWith(
      'materials/material-id/base.png',
    );
    expect(storageService.readFile).toHaveBeenCalledWith(
      'materials/material-id/two.png',
    );
    expect(imageService.validate).toHaveBeenCalledTimes(2);
  });

  it('não publica quando o preflight do preset não está pronto', async () => {
    const printPreflight = {
      run: jest.fn().mockResolvedValue({
        status: 'FAILED',
        issues: [
          { code: 'CANVAS_ASPECT_RATIO', message: 'Proporção inválida' },
        ],
      }),
    };
    const useCaseWithPreset = new PublishMaterialTemplateUseCase(
      repository,
      new MaterialTemplateDocumentService(),
      imageService as unknown as MaterialTemplateImageService,
      responseService as unknown as MaterialTemplateResponseService,
      storageService as unknown as StorageService,
      printPreflight as unknown as PrintPreflightService,
    );
    repository.findOrThrow.mockResolvedValue({
      ...template,
      printPresetId: 'preset-id',
    } as never);

    await expect(
      useCaseWithPreset.execute('material-id', 'org-id', 'user-id', {
        revision: 7,
      }),
    ).rejects.toThrow('Proporção inválida');
    expect(repository.publish).not.toHaveBeenCalled();
  });
});
