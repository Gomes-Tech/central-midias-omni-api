import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { MaterialTemplateStatus, Prisma } from '@prisma/client';
import { MaterialTemplateDocumentV1 } from '../entities';

const templateSelect = {
  id: true,
  organizationId: true,
  materialId: true,
  baseMaterialFileId: true,
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
      mimeType: true,
      size: true,
    },
  },
  material: {
    select: {
      id: true,
      categoryId: true,
      isCustomizable: true,
      deletedAt: true,
      materialFiles: { select: { id: true, mimeType: true } },
    },
  },
  assets: { select: { assetId: true } },
} satisfies Prisma.MaterialTemplateSelect;

export type MaterialTemplateRow = Prisma.MaterialTemplateGetPayload<{
  select: typeof templateSelect;
}>;

export interface MaterialTemplateAssetRow {
  id: string;
  name: string;
  fileKey: string;
  mimeType: string;
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
    document: MaterialTemplateDocumentV1,
    assetIds: string[],
    userId: string,
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
          schemaVersion: 1,
          legacyImport: Prisma.DbNull,
          status: MaterialTemplateStatus.DRAFT,
          publishedAt: null,
          revision: { increment: 1 },
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
      select: { id: true, name: true, fileKey: true, mimeType: true },
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
    mimeType: string;
    size: number;
    document: MaterialTemplateDocumentV1 | null;
    userId: string;
  }): Promise<{
    template: MaterialTemplateRow;
    previousFileKey: string | null;
  }> {
    const { template, fileKey, mimeType, size, document, userId } = options;
    const previousFileKey = template.baseFile?.imageKey ?? null;
    const newFileId = generateId();

    await this.prisma.$transaction(async (tx) => {
      await tx.materialFile.create({
        data: {
          id: newFileId,
          materialId: template.materialId,
          imageKey: fileKey,
          mimeType,
          size,
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
    if (!template.baseFile || template.material.materialFiles.length !== 1) {
      throw new BadRequestException(
        'O material customizável deve possuir exatamente uma imagem base',
      );
    }
    if (
      !['image/png', 'image/jpeg', 'image/jpg'].includes(
        template.baseFile.mimeType.toLowerCase(),
      )
    ) {
      throw new BadRequestException('A imagem base deve ser PNG ou JPEG');
    }
  }
}
