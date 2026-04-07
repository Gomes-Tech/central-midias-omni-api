import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateBannerDTO } from '../dto/create-banner.dto';
import { UpdateBannerDTO } from '../dto/update-banner.dto';

@Injectable()
export class BannerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(params: {
    organizationId: string;
    onlyActive?: boolean;
    referenceDate?: Date;
  }) {
    const { organizationId, onlyActive = true, referenceDate } = params;

    try {
      const where: Prisma.BannerWhereInput = {
        organizationId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
        ...(referenceDate
          ? {
              AND: [
                {
                  OR: [
                    { initialDate: null },
                    { initialDate: { lte: referenceDate } },
                  ],
                },
                {
                  OR: [
                    { finishDate: null },
                    { finishDate: { gte: referenceDate } },
                  ],
                },
              ],
            }
          : {}),
      };

      return await this.prisma.banner.findMany({
        where,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    } catch (error) {
      void this.logger.error('BannerRepository.findAll falhou', {
        error: String(error),
        organizationId,
        onlyActive,
        referenceDate,
      });

      throw new BadRequestException('Erro ao buscar banners');
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      return await this.prisma.banner.findFirst({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
      });
    } catch (error) {
      void this.logger.error('BannerRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar banner');
    }
  }

  async create(
    organizationId: string,
    data: CreateBannerDTO & { mobileImageKey: string; desktopImageKey: string },
    userId: string,
  ) {
    try {
      await this.prisma.banner.create({
        data: {
          organizationId,
          name: data.name,
          link: data.link ?? null,
          order: data.order,
          isActive: data.isActive ?? true,
          initialDate: data.initialDate ?? null,
          finishDate: data.finishDate ?? null,
          mobileImageKey: data.mobileImageKey,
          desktopImageKey: data.desktopImageKey,
        },
      });

      void this.logger.info('Banner criado', {
        organizationId,
        userId,
        name: data.name,
      });
    } catch (error) {
      void this.logger.error('BannerRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        name: data.name,
      });

      throw new BadRequestException('Erro ao criar banner');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateBannerDTO & {
      mobileImageKey?: string;
      desktopImageKey?: string;
    },
    userId: string,
  ) {
    try {
      await this.prisma.banner.updateMany({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.link !== undefined && { link: data.link }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.initialDate !== undefined && {
            initialDate: data.initialDate,
          }),
          ...(data.finishDate !== undefined && { finishDate: data.finishDate }),
          ...(data.mobileImageKey !== undefined && {
            mobileImageKey: data.mobileImageKey,
          }),
          ...(data.desktopImageKey !== undefined && {
            desktopImageKey: data.desktopImageKey,
          }),
        },
      });

      void this.logger.info('Banner atualizado', {
        bannerId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('BannerRepository.update falhou', {
        error: String(error),
        bannerId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar banner');
    }
  }

  async softDelete(id: string, organizationId: string, userId: string) {
    try {
      await this.prisma.banner.updateMany({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Banner removido', {
        bannerId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('BannerRepository.softDelete falhou', {
        error: String(error),
        bannerId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover banner');
    }
  }
}
