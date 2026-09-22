import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  CUSTOMIZABLE_IMAGE_COUNT_MESSAGE,
  MAX_CUSTOMIZABLE_MATERIAL_IMAGES,
  MIN_CUSTOMIZABLE_MATERIAL_IMAGES,
} from '@modules/material/material.constants';
import { Injectable } from '@nestjs/common';
import { MaterialTemplateStatus, Prisma } from '@prisma/client';
import { MaterialTemplateDocument } from '../entities';

const templateSelect = {
  id: true,
  organizationId: true,
  materialId: true,
  baseMaterialFileId: true,
  printPresetId: true,
  digitalExportMimeType: true,
  allowedExportTypes: true,
  status: true,
  schemaVersion: true,
  document: true,
  legacyImport: true,
  revision: true,
  publishedAt: true,
  updatedAt: true,
  baseFile: {
    select: {
      id: true,
      imageKey: true,
      originalName: true,
      mimeType: true,
      size: true,
      width: true,
      height: true,
      sortOrder: true,
    },
  },
  material: {
    select: {
      id: true,
      categoryId: true,
      isCustomizable: true,
      deletedAt: true,
      materialFiles: {
        select: {
          id: true,
          imageKey: true,
          originalName: true,
          mimeType: true,
          size: true,
          width: true,
          height: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  },
  assets: { select: { assetId: true } },
  printPreset: {
    include: {
      colorProfile: {
        select: {
          id: true,
          name: true,
          checksum: true,
          outputConditionIdentifier: true,
          isActive: true,
        },
      },
    },
  },
  printPreflight: true,
} satisfies Prisma.MaterialTemplateSelect;

export type MaterialTemplateRow = Prisma.MaterialTemplateGetPayload<{
  select: typeof templateSelect;
}>;

export interface MaterialTemplateAssetRow {
  id: string;
  name: string;
  fileKey: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface MaterialTemplateDeliveryInput {
  digitalExportMimeType: string | null;
  printPresetId: string | null;
  allowedExportTypes?: string[];
}

@Injectable()
export class MaterialTemplateRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findByMaterialId(
    materialId: string,
    organizationId: string,
  ): Promise<MaterialTemplateRow | null> {
    return await this.prisma.materialTemplate.findFirst({
      where: {
        materialId,
        organizationId,
        material: {
          deletedAt: null,
          category: { organizationId, isDeleted: false },
        },
      },
      select: templateSelect,
    });
  }

  async findOrThrow(
    materialId: string,
    organizationId: string,
  ): Promise<MaterialTemplateRow> {
    const template = await this.findByMaterialId(materialId, organizationId);
    if (!template) throw new NotFoundException('Template não encontrado');
    return template;
  }

  async ensureDraft(
    materialId: string,
    organizationId: string,
    baseMaterialFileId: string | null,
  ): Promise<MaterialTemplateRow> {
    await this.prisma.materialTemplate.upsert({
      where: { materialId },
      create: {
        id: generateId(),
        materialId,
        organizationId,
        baseMaterialFileId,
        status: MaterialTemplateStatus.DRAFT,
      },
      update: {
        ...(baseMaterialFileId && { baseMaterialFileId }),
        status: MaterialTemplateStatus.DRAFT,
        publishedAt: null,
      },
    });
    return await this.findOrThrow(materialId, organizationId);
  }

  async save(
    template: MaterialTemplateRow,
    revision: number,
    document: MaterialTemplateDocument,
    assetIds: string[],
    userId: string,
    delivery?: MaterialTemplateDeliveryInput,
  ): Promise<MaterialTemplateRow> {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.materialTemplate.updateMany({
        where: {
          id: template.id,
          organizationId: template.organizationId,
          revision,
        },
        data: {
          document: document as unknown as Prisma.InputJsonValue,
          schemaVersion: document.version,
          legacyImport: Prisma.DbNull,
          status: MaterialTemplateStatus.DRAFT,
          publishedAt: null,
          revision: { increment: 1 },
          ...(delivery && delivery),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'O template foi alterado em outra sessão. Recarregue para continuar.',
        );
      }
      await tx.materialTemplateAsset.deleteMany({
        where: { templateId: template.id },
      });
      if (assetIds.length) {
        await tx.materialTemplateAsset.createMany({
          data: assetIds.map((assetId) => ({
            templateId: template.id,
            assetId,
          })),
          skipDuplicates: true,
        });
      }
      await tx.printPreflight.deleteMany({
        where: { templateId: template.id },
      });
    });

    void this.logger.info('Rascunho de template salvo', {
      templateId: template.id,
      materialId: template.materialId,
      organizationId: template.organizationId,
      userId,
    });
    return await this.findOrThrow(template.materialId, template.organizationId);
  }

  async publish(
    template: MaterialTemplateRow,
    revision: number,
    userId: string,
  ): Promise<MaterialTemplateRow> {
    const updated = await this.prisma.materialTemplate.updateMany({
      where: {
        id: template.id,
        organizationId: template.organizationId,
        revision,
      },
      data: {
        status: MaterialTemplateStatus.PUBLISHED,
        publishedAt: new Date(),
        revision: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'O template foi alterado em outra sessão. Recarregue para continuar.',
      );
    }
    void this.logger.info('Template publicado', {
      templateId: template.id,
      materialId: template.materialId,
      organizationId: template.organizationId,
      userId,
    });
    return await this.findOrThrow(template.materialId, template.organizationId);
  }

  async findAssets(
    assetIds: string[],
    organizationId: string,
  ): Promise<MaterialTemplateAssetRow[]> {
    if (!assetIds.length) return [];
    return await this.prisma.asset.findMany({
      where: { id: { in: assetIds }, organizationId },
      select: {
        id: true,
        name: true,
        fileKey: true,
        mimeType: true,
        size: true,
        width: true,
        height: true,
      },
    });
  }

  async invalidateByAssetId(
    assetId: string,
    organizationId: string,
  ): Promise<number> {
    const templates = await this.prisma.materialTemplateAsset.findMany({
      where: { assetId, template: { organizationId } },
      select: { templateId: true },
    });
    if (!templates.length) return 0;
    const result = await this.prisma.materialTemplate.updateMany({
      where: { id: { in: templates.map((item) => item.templateId) } },
      data: {
        status: MaterialTemplateStatus.DRAFT,
        publishedAt: null,
        revision: { increment: 1 },
      },
    });
    return result.count;
  }

  async replaceBaseFile(options: {
    template: MaterialTemplateRow;
    fileKey: string;
    originalName: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    document: MaterialTemplateDocument | null;
    userId: string;
  }): Promise<{
    template: MaterialTemplateRow;
    previousFileKey: string | null;
  }> {
    const {
      template,
      fileKey,
      originalName,
      mimeType,
      size,
      width,
      height,
      document,
      userId,
    } = options;
    const previousFileKey = template.baseFile?.imageKey ?? null;
    const newFileId = generateId();

    await this.prisma.$transaction(async (tx) => {
      const originalSortOrder = template.baseFile?.sortOrder ?? 0;

      if (template.baseFile) {
        const lastFile = await tx.materialFile.findFirst({
          where: { materialId: template.materialId },
          select: { sortOrder: true },
          orderBy: { sortOrder: 'desc' },
        });
        await tx.materialFile.update({
          where: { id: template.baseFile.id },
          data: { sortOrder: (lastFile?.sortOrder ?? originalSortOrder) + 1 },
        });
      }

      await tx.materialFile.create({
        data: {
          id: newFileId,
          materialId: template.materialId,
          imageKey: fileKey,
          originalName,
          mimeType,
          size,
          width,
          height,
          sortOrder: originalSortOrder,
        },
      });
      await tx.materialTemplate.update({
        where: { id: template.id },
        data: {
          baseMaterialFileId: newFileId,
          status: MaterialTemplateStatus.DRAFT,
          publishedAt: null,
          revision: { increment: 1 },
          ...(document && {
            document: document as unknown as Prisma.InputJsonValue,
          }),
        },
      });
      await tx.materialFile.deleteMany({
        where: {
          materialId: template.materialId,
          id: { not: newFileId },
        },
      });
    });

    void this.logger.info('Imagem base do template substituída', {
      templateId: template.id,
      materialId: template.materialId,
      organizationId: template.organizationId,
      userId,
    });
    return {
      template: await this.findOrThrow(
        template.materialId,
        template.organizationId,
      ),
      previousFileKey,
    };
  }

  assertMaterialCanPublish(template: MaterialTemplateRow): void {
    if (!template.material.isCustomizable) {
      throw new BadRequestException(
        'O material não está marcado como customizável',
      );
    }
    const files = template.material.materialFiles;
    if (
      !template.baseFile ||
      files.length < MIN_CUSTOMIZABLE_MATERIAL_IMAGES ||
      files.length > MAX_CUSTOMIZABLE_MATERIAL_IMAGES
    ) {
      throw new BadRequestException(CUSTOMIZABLE_IMAGE_COUNT_MESSAGE);
    }
    if (files[0]?.id !== template.baseFile.id) {
      throw new BadRequestException(
        'A imagem base deve ser a primeira imagem do material',
      );
    }
    if (
      files.some(
        (file) =>
          !['image/png', 'image/jpeg', 'image/jpg'].includes(
            file.mimeType.toLowerCase(),
          ),
      )
    ) {
      throw new BadRequestException(
        'As imagens do material devem ser PNG ou JPEG',
      );
    }
  }
}
