import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import { FindAllAssetsFiltersDTO } from '../dto';
import { AssetEntity } from '../entities';

const assetSelect = {
  id: true,
  organizationId: true,
  name: true,
  fileKey: true,
  mimeType: true,
  size: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AssetSelect;

export interface CreateAssetInput {
  id: string;
  name: string;
  fileKey: string;
  mimeType: string;
  size: number;
}

export interface UpdateAssetInput {
  name?: string;
  fileKey?: string;
  mimeType?: string;
  size?: number;
}

@Injectable()
export class AssetRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    organizationId: string,
    filters: FindAllAssetsFiltersDTO = {},
  ): Promise<PaginatedResponse<AssetEntity>> {
    const { page = 1, limit = 25, searchTerm } = filters;
    const skip = (page - 1) * limit;
    const where: Prisma.AssetWhereInput = {
      organizationId,
      ...(searchTerm && {
        name: { contains: searchTerm, mode: 'insensitive' },
      }),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.asset.findMany({
          where,
          select: assetSelect,
          orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.asset.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('AssetRepository.findAll falhou', {
        error: String(error),
        organizationId,
        searchTerm,
      });
      throw new BadRequestException('Erro ao buscar assets');
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<AssetEntity | null> {
    try {
      return await this.prisma.asset.findFirst({
        where: { id, organizationId },
        select: assetSelect,
      });
    } catch (error) {
      void this.logger.error('AssetRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });
      throw new BadRequestException('Erro ao buscar asset');
    }
  }

  async createMany(
    organizationId: string,
    data: CreateAssetInput[],
    userId: string,
  ): Promise<AssetEntity[]> {
    try {
      const assets = await this.prisma.$transaction(async (tx) =>
        Promise.all(
          data.map((asset) =>
            tx.asset.create({
              data: { ...asset, organizationId },
              select: assetSelect,
            }),
          ),
        ),
      );

      void this.logger.info('Assets criados', {
        organizationId,
        userId,
        assetIds: assets.map((asset) => asset.id),
      });
      return assets;
    } catch (error) {
      void this.logger.error('AssetRepository.createMany falhou', {
        error: String(error),
        organizationId,
        userId,
      });
      throw new BadRequestException('Erro ao criar assets');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateAssetInput,
    userId: string,
  ): Promise<AssetEntity> {
    try {
      await this.prisma.asset.updateMany({
        where: { id, organizationId },
        data,
      });
      const asset = await this.prisma.asset.findFirst({
        where: { id, organizationId },
        select: assetSelect,
      });
      if (!asset) {
        throw new Error('Asset não encontrado após atualização');
      }

      void this.logger.info('Asset atualizado', {
        assetId: id,
        organizationId,
        userId,
      });
      return asset;
    } catch (error) {
      void this.logger.error('AssetRepository.update falhou', {
        error: String(error),
        assetId: id,
        organizationId,
        userId,
      });
      throw new BadRequestException('Erro ao atualizar asset');
    }
  }

  async delete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const dependencies = await tx.materialTemplateAsset.findMany({
          where: { assetId: id, template: { organizationId } },
          select: { templateId: true },
        });
        if (dependencies.length) {
          await tx.materialTemplate.updateMany({
            where: {
              id: { in: dependencies.map(({ templateId }) => templateId) },
              organizationId,
            },
            data: {
              status: 'DRAFT',
              publishedAt: null,
              revision: { increment: 1 },
            },
          });
        }
        await tx.asset.deleteMany({ where: { id, organizationId } });
      });
      void this.logger.info('Asset removido', {
        assetId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('AssetRepository.delete falhou', {
        error: String(error),
        assetId: id,
        organizationId,
        userId,
      });
      throw new BadRequestException('Erro ao remover asset');
    }
  }
}
