import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import { FindAllBannersFiltersDTO } from '../dto';
import { CreateBannerDTO } from '../dto/create-banner.dto';
import { UpdateBannerDTO } from '../dto/update-banner.dto';
import { Banner, BannerList } from '../entities';

const bannerListSelect = {
  id: true,
  name: true,
  link: true,
  order: true,
  isActive: true,
  initialDate: true,
  finishDate: true,
} satisfies Prisma.BannerSelect;

@Injectable()
export class BannerRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllBannersFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<BannerList>> {
    const {
      onlyActive = false,
      initialDate,
      finishDate,
      page = 1,
      limit = 25,
      searchTerm,
    } = filters;
    const skip = (page - 1) * limit;

    const dateFilters: Prisma.BannerWhereInput[] = [];

    if (initialDate) {
      dateFilters.push({
        OR: [{ initialDate: null }, { initialDate: { lte: initialDate } }],
      });
    }

    if (finishDate) {
      dateFilters.push({
        OR: [{ finishDate: null }, { finishDate: { gte: finishDate } }],
      });
    }

    try {
      const where: Prisma.BannerWhereInput = {
        organizationId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
        ...(dateFilters.length > 0 ? { AND: dateFilters } : {}),
        ...(searchTerm && {
          name: { contains: searchTerm, mode: 'insensitive' },
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.banner.findMany({
          where,
          select: bannerListSelect,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.banner.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('BannerRepository.findAll falhou', {
        error: String(error),
        organizationId,
        onlyActive,
        initialDate,
        finishDate,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar banners');
    }
  }

  async findList(
    organizationId: string,
  ): Promise<Omit<Banner, 'mobileImageUrl' | 'desktopImageUrl'>[]> {
    try {
      const data = await this.prisma.banner.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          organizationId,
          initialDate: {
            lte: new Date(),
          },
          finishDate: {
            gte: new Date(),
          },
        },
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          name: true,
          link: true,
          order: true,
          desktopImageKey: true,
          mobileImageKey: true,
          initialDate: true,
          finishDate: true,
          isActive: true,
        },
      });

      return data;
    } catch (error) {
      void this.logger.error('BannerRepository.findList falhou', {
        error: String(error),
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
        select: {
          id: true,
          name: true,
          link: true,
          order: true,
          isActive: true,
          initialDate: true,
          finishDate: true,
          mobileImageKey: true,
          desktopImageKey: true,
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
          id: generateId(),
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
