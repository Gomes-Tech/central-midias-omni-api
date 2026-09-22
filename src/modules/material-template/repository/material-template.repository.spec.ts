import { ConflictException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  MaterialTemplateDocumentV1,
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '../entities';
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

  it('carrega os arquivos do material na ordem de exibição', async () => {
    prisma.materialTemplate.findFirst.mockResolvedValue(null);
    await repository.findByMaterialId('material-id', 'org-id');

    expect(prisma.materialTemplate.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          material: expect.objectContaining({
            select: expect.objectContaining({
              materialFiles: expect.objectContaining({
                orderBy: { sortOrder: 'asc' },
              }),
            }),
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
      printPreflight: { deleteMany: jest.fn() },
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
      {
        digitalExportMimeType: 'image/png',
        printPresetId: 'preset-id',
      },
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
        digitalExportMimeType: 'image/png',
        printPresetId: 'preset-id',
      }),
    });
    expect(tx.materialTemplateAsset.createMany).toHaveBeenCalledWith({
      data: [
        { templateId: 'template-id', assetId: 'asset-1' },
        { templateId: 'template-id', assetId: 'asset-2' },
      ],
      skipDuplicates: true,
    });
    expect(tx.materialTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schemaVersion: 1 }),
      }),
    );
    expect(tx.printPreflight.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 'template-id' },
    });
  });

  it('substitui a imagem base preservando a posição sem colidir na unicidade', async () => {
    const currentTemplate = template({
      baseFile: {
        id: 'file-id',
        imageKey: 'materials/material-id/base.png',
        originalName: 'base.png',
        mimeType: 'image/png',
        size: 100,
        width: 1080,
        height: 1080,
        sortOrder: 2,
      },
    });
    const tx = {
      materialFile: {
        findFirst: jest.fn().mockResolvedValue({ sortOrder: 7 }),
        update: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      materialTemplate: { update: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    prisma.materialTemplate.findFirst.mockResolvedValue(currentTemplate);

    await repository.replaceBaseFile({
      template: currentTemplate,
      fileKey: 'materials/material-id/new.png',
      originalName: 'nova arte.png',
      mimeType: 'image/png',
      size: 200,
      width: 1200,
      height: 1200,
      document: null,
      userId: 'user-id',
    });

    expect(tx.materialFile.update).toHaveBeenCalledWith({
      where: { id: 'file-id' },
      data: { sortOrder: 8 },
    });
    expect(tx.materialFile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        materialId: 'material-id',
        originalName: 'nova arte.png',
        sortOrder: 2,
      }),
    });
    expect(tx.materialFile.deleteMany).toHaveBeenCalledWith({
      where: {
        materialId: 'material-id',
        id: { not: 'mocked-uuid' },
      },
    });
  });

  it('persiste a versão do schema do documento V2', async () => {
    const richDocument: MaterialTemplateDocumentV2 = {
      version: 2,
      canvas: { width: 100, height: 100 },
      layerOrder: [],
      layers: [],
    };
    const tx = {
      materialTemplate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      materialTemplateAsset: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      printPreflight: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    prisma.materialTemplate.findFirst.mockResolvedValue(template());

    await repository.save(template(), 3, richDocument, [], 'user-id');

    expect(tx.materialTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schemaVersion: 2 }),
      }),
    );
  });

  it('persiste a versão do schema do documento V3', async () => {
    const multipageDocument: MaterialTemplateDocumentV3 = {
      version: 3,
      pages: [
        {
          materialFileId: 'file-id',
          canvas: { width: 100, height: 100 },
          layerOrder: [],
          layers: [],
        },
      ],
    };
    const tx = {
      materialTemplate: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      materialTemplateAsset: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      printPreflight: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));
    prisma.materialTemplate.findFirst.mockResolvedValue(template());

    await repository.save(template(), 3, multipageDocument, [], 'user-id');

    expect(tx.materialTemplate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schemaVersion: 3 }),
      }),
    );
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

  describe('assertMaterialCanPublish', () => {
    function customizableTemplate(
      files: Array<{
        id: string;
        mimeType: string;
        sortOrder: number;
      }>,
      baseFileId = files[0]?.id ?? null,
    ) {
      const materialFiles = files.map((file) => ({
        id: file.id,
        imageKey: `materials/material-id/${file.id}`,
        originalName: `${file.id}.png`,
        mimeType: file.mimeType,
        size: 100,
        width: 1080,
        height: 1080,
        sortOrder: file.sortOrder,
      }));
      return template({
        baseFile: baseFileId
          ? {
              id: baseFileId,
              imageKey: `materials/material-id/${baseFileId}`,
              originalName: `${baseFileId}.png`,
              mimeType: 'image/png',
              size: 100,
              width: 1080,
              height: 1080,
              sortOrder: 0,
            }
          : null,
        material: {
          id: 'material-id',
          categoryId: 'category-id',
          isCustomizable: true,
          deletedAt: null,
          materialFiles,
        },
      });
    }

    it('aceita de uma a vinte imagens PNG ou JPEG', () => {
      const files = Array.from({ length: 20 }, (_, index) => ({
        id: `file-${index}`,
        mimeType: index % 2 === 0 ? 'image/png' : 'image/jpeg',
        sortOrder: index,
      }));

      expect(() =>
        repository.assertMaterialCanPublish(customizableTemplate(files)),
      ).not.toThrow();
    });

    it('rejeita material sem imagens e acima de vinte', () => {
      const tooMany = Array.from({ length: 21 }, (_, index) => ({
        id: `file-${index}`,
        mimeType: 'image/png',
        sortOrder: index,
      }));

      expect(() =>
        repository.assertMaterialCanPublish(customizableTemplate([])),
      ).toThrow('de 1 a 20 imagens');
      expect(() =>
        repository.assertMaterialCanPublish(customizableTemplate(tooMany)),
      ).toThrow('de 1 a 20 imagens');
    });

    it('rejeita quando a âncora não é a primeira imagem', () => {
      const files = [
        { id: 'file-0', mimeType: 'image/png', sortOrder: 0 },
        { id: 'file-1', mimeType: 'image/png', sortOrder: 1 },
      ];

      expect(() =>
        repository.assertMaterialCanPublish(
          customizableTemplate(files, 'file-1'),
        ),
      ).toThrow('primeira imagem do material');
    });

    it('rejeita imagem que não seja PNG ou JPEG', () => {
      const files = [
        { id: 'file-0', mimeType: 'image/png', sortOrder: 0 },
        { id: 'file-1', mimeType: 'application/pdf', sortOrder: 1 },
      ];

      expect(() =>
        repository.assertMaterialCanPublish(customizableTemplate(files)),
      ).toThrow('devem ser PNG ou JPEG');
    });
  });
});
