import { PrintPreflightService } from './print-preflight.service';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import {
  placeholderDocument,
  printImagePreset,
} from '../../../test-utils/print-image-fixtures';

function page(materialFileId: string, width = 1000, height = 1000) {
  return {
    materialFileId,
    canvas: { width, height },
    layerOrder: [],
    layers: [],
  };
}

function templateFixture() {
  return {
    id: 'template',
    revision: 1,
    baseMaterialFileId: 'file-a',
    document: placeholderDocument,
    baseFile: {
      id: 'file-a',
      imageKey: 'base.png',
      size: 10,
      originalName: 'Frente',
      mimeType: 'image/png',
      sortOrder: 0,
      width: 1000,
      height: 1000,
    },
    assets: [],
    material: {
      materialFiles: [
        {
          id: 'file-a',
          imageKey: 'base.png',
          originalName: 'Frente',
          mimeType: 'image/png',
          size: 10,
          width: 1000,
          height: 1000,
          sortOrder: 0,
        },
        {
          id: 'file-b',
          imageKey: 'two.png',
          originalName: 'Verso',
          mimeType: 'image/png',
          size: 10,
          width: 1000,
          height: 1000,
          sortOrder: 1,
        },
      ],
    },
    printPreset: {
      ...printImagePreset,
      isActive: true,
      updatedAt: new Date(),
      colorProfile: { ...printImagePreset.colorProfile, isActive: true },
    },
  };
}

function buildService(template: ReturnType<typeof templateFixture>) {
  const service = new PrintPreflightService(
    {
      materialTemplate: { findFirst: jest.fn().mockResolvedValue(template) },
      printPreflight: { upsert: jest.fn(async ({ create }) => create) },
      materialFile: { update: jest.fn() },
    } as never,
    {} as never,
    new MaterialTemplateDocumentService(),
  );
  return service;
}

describe('PrintPreflightService placeholders', () => {
  it('aprova a estrutura publicável sem exigir a foto que será enviada pelo agente', async () => {
    const template = templateFixture();
    const service = buildService(template);
    const result = await service.run('material', 'org');
    expect(result.status).toBe('READY');
    expect(result.issues).toEqual([]);
    template.baseFile.width = 1;
    expect((await service.run('material', 'org')).status).toBe('FAILED');
  });
});

describe('PrintPreflightService multipágina', () => {
  it('aprova quando todas as páginas respeitam o preset', async () => {
    const template = templateFixture();
    template.document = {
      version: 3,
      pages: [page('file-a'), page('file-b')],
    } as never;
    const result = await buildService(template).run('material', 'org');
    expect(result.status).toBe('READY');
    expect(result.issues).toEqual([]);
  });

  it('reprova o template e identifica a imagem da segunda página fora da sangria', async () => {
    const template = templateFixture();
    template.document = {
      version: 3,
      pages: [page('file-a'), page('file-b', 2000, 1000)],
    } as never;
    const result = await buildService(template).run('material', 'org');
    expect(result.status).toBe('FAILED');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CANVAS_ASPECT_RATIO',
          materialFileId: 'file-b',
          message: expect.stringContaining('Verso'),
        }),
      ]),
    );
  });

  it('mantém a aprovação quando só a primeira página existe', async () => {
    const template = templateFixture();
    template.document = {
      version: 3,
      pages: [page('file-a')],
    } as never;
    const result = await buildService(template).run('material', 'org');
    expect(result.status).toBe('READY');
    expect(result.issues).toEqual([]);
  });

  it('usa o nome de exibição posicional quando a imagem não tem nome original', async () => {
    const template = templateFixture();
    template.material.materialFiles[1].originalName = null as never;
    template.document = {
      version: 3,
      pages: [page('file-a'), page('file-b', 2000, 1000)],
    } as never;
    const result = await buildService(template).run('material', 'org');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'CANVAS_ASPECT_RATIO',
          materialFileId: 'file-b',
          message: expect.stringContaining('Imagem 2'),
        }),
      ]),
    );
  });
});
