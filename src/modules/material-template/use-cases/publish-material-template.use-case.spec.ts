import { StorageService } from '@infrastructure/providers';
import { MaterialTemplateDocumentV1 } from '../entities';
import { MaterialTemplateRepository } from '../repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from '../services';
import { PublishMaterialTemplateUseCase } from './publish-material-template.use-case';

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

describe('PublishMaterialTemplateUseCase', () => {
  let repository: jest.Mocked<MaterialTemplateRepository>;
  let responseService: { resolve: jest.Mock };
  let imageService: { validate: jest.Mock };
  let storageService: { readFile: jest.Mock };
  let useCase: PublishMaterialTemplateUseCase;
  const template = {
    id: 'template-id',
    organizationId: 'org-id',
    materialId: 'material-id',
    document,
    baseFile: {
      imageKey: 'materials/material-id/base.png',
      size: 1024,
      mimeType: 'image/png',
    },
  };

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

  it('bloqueia publicação sem pelo menos um texto editável', async () => {
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
    ).rejects.toThrow('ao menos um texto editável');
    expect(repository.publish).not.toHaveBeenCalled();
  });

  it('bloqueia publicação com dependência ausente', async () => {
    repository.findAssets.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { revision: 7 }),
    ).rejects.toThrow('Substitua os assets ausentes');
  });
});
