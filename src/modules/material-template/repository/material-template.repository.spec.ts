import { ConflictException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { MaterialTemplateDocumentV1 } from '../entities';
import {
  MaterialTemplateRepository,
  MaterialTemplateRow,
} from './material-template.repository';

const document: MaterialTemplateDocumentV1 = {
  version: 1,
  canvas: { width: 1080, height: 1080 },
  layerOrder: ['text'],
  layers: [
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

function template(overrides: Partial<MaterialTemplateRow> = {}) {
  return {
    id: 'template-id',
    organizationId: 'org-id',
    materialId: 'material-id',
    baseMaterialFileId: 'file-id',
    status: 'PUBLISHED',
    schemaVersion: 1,
    document,
    legacyImport: null,
    revision: 3,
    publishedAt: new Date(),
    updatedAt: new Date(),
    baseFile: {
      id: 'file-id',
      imageKey: 'materials/material-id/base.png',
      mimeType: 'image/png',
      size: 100,
    },
    material: {
      id: 'material-id',
      categoryId: 'category-id',
      isCustomizable: true,
      deletedAt: null,
      materialFiles: [{ id: 'file-id', mimeType: 'image/png' }],
    },
    assets: [],
    ...overrides,
  } as MaterialTemplateRow;
}

describe('MaterialTemplateRepository', () => {
  let repository: MaterialTemplateRepository;
  let prisma: {
    materialTemplate: { findFirst: jest.Mock; updateMany: jest.Mock };
    materialTemplateAsset: { findMany: jest.Mock };
    asset: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      materialTemplate: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      materialTemplateAsset: { findMany: jest.fn() },
      asset: { findMany: jest.fn() },
      $transaction: jest.fn(),
    };
    repository = new MaterialTemplateRepository(
      prisma as unknown as PrismaService,
      { info: jest.fn(), error: jest.fn() } as unknown as LoggerService,
    );
  });

  it('isola a busca por material e organização', async () => {
    prisma.materialTemplate.findFirst.mockResolvedValue(null);
    await repository.findByMaterialId('material-id', 'org-id');

    expect(prisma.materialTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          materialId: 'material-id',
          organizationId: 'org-id',
          material: expect.objectContaining({
            category: { organizationId: 'org-id', isDeleted: false },
          }),
        }),
      }),
    );
  });

  it('retorna 409 quando a revisão do salvamento está desatualizada', async () => {
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        materialTemplate: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      }),
    );

    await expect(
      repository.save(template(), 2, document, [], 'user-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('salva o documento, volta a rascunho e sincroniza assets', async () => {
    const tx = {
      materialTemplate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      materialTemplateAsset: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    prisma.materialTemplate.findFirst.mockResolvedValue(
      template({ status: 'DRAFT', revision: 4 }),
    );

    await repository.save(
      template(),
      3,
      document,
      ['asset-1', 'asset-2'],
      'user-id',
    );

    expect(tx.materialTemplate.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'template-id',
        organizationId: 'org-id',
        revision: 3,
      },
      data: expect.objectContaining({
        status: 'DRAFT',
        publishedAt: null,
        revision: { increment: 1 },
      }),
    });
    expect(tx.materialTemplateAsset.createMany).toHaveBeenCalledWith({
      data: [
        { templateId: 'template-id', assetId: 'asset-1' },
        { templateId: 'template-id', assetId: 'asset-2' },
      ],
      skipDuplicates: true,
    });
  });

  it('despublica todos os templates dependentes quando um asset é invalidado', async () => {
    prisma.materialTemplateAsset.findMany.mockResolvedValue([
      { templateId: 'template-1' },
      { templateId: 'template-2' },
    ]);
    prisma.materialTemplate.updateMany.mockResolvedValue({ count: 2 });

    await expect(
      repository.invalidateByAssetId('asset-id', 'org-id'),
    ).resolves.toBe(2);
    expect(prisma.materialTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['template-1', 'template-2'] } },
      data: {
        status: 'DRAFT',
        publishedAt: null,
        revision: { increment: 1 },
      },
    });
  });
});
