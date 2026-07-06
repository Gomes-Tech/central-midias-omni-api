import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import { FindAllSocialHighlightsFiltersDTO } from '../dto';
import { CreateSocialHighlightDTO } from '../dto/create-social-highlight.dto';
import { UpdateSocialHighlightDTO } from '../dto/update-social-highlight.dto';
import { SocialHighlight, SocialHighlightList } from '../entities';

const socialHighlightListSelect = {
  id: true,
  name: true,
  link: true,
  order: true,
  isActive: true,
  initialDate: true,
  finishDate: true,
} satisfies Prisma.SocialHighlightSelect;

@Injectable()
export class SocialHighlightRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllSocialHighlightsFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<SocialHighlightList>> {
    const {
      onlyActive = false,
      initialDate,
      finishDate,
      page = 1,
      limit = 25,
      searchTerm,
    } = filters;
    const skip = (page - 1) * limit;

    const dateFilters: Prisma.SocialHighlightWhereInput[] = [];

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
      const where: Prisma.SocialHighlightWhereInput = {
        organizationId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
        ...(dateFilters.length > 0 ? { AND: dateFilters } : {}),
        ...(searchTerm && {
          name: { contains: searchTerm, mode: 'insensitive' },
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.socialHighlight.findMany({
          where,
          select: socialHighlightListSelect,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.socialHighlight.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('SocialHighlightRepository.findAll falhou', {
        error: String(error),
        organizationId,
        onlyActive,
        initialDate,
        finishDate,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar destaques sociais');
    }
  }

  async findList(
    organizationId: string,
  ): Promise<Omit<SocialHighlight, 'mobileImageUrl' | 'desktopImageUrl'>[]> {
    try {
      const now = new Date();

      const data = await this.prisma.socialHighlight.findMany({
        where: {
          isActive: true,
          isDeleted: false,
          organizationId,
          AND: [
            {
              OR: [{ initialDate: null }, { initialDate: { lte: now } }],
            },
            {
              OR: [{ finishDate: null }, { finishDate: { gte: now } }],
            },
          ],
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
      void this.logger.error('SocialHighlightRepository.findList falhou', {
        error: String(error),
      });

      throw new BadRequestException('Erro ao buscar destaques sociais');
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      return await this.prisma.socialHighlight.findFirst({
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
      void this.logger.error('SocialHighlightRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar destaque social');
    }
  }

  async create(
    organizationId: string,
    data: CreateSocialHighlightDTO & {
      mobileImageKey: string;
      desktopImageKey: string;
    },
    userId: string,
  ) {
    try {
      await this.prisma.socialHighlight.create({
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

      void this.logger.info('Destaque social criado', {
        organizationId,
        userId,
        name: data.name,
      });
    } catch (error) {
      void this.logger.error('SocialHighlightRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        name: data.name,
      });

      throw new BadRequestException('Erro ao criar destaque social');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateSocialHighlightDTO & {
      mobileImageKey?: string;
      desktopImageKey?: string;
    },
    userId: string,
  ) {
    try {
      await this.prisma.socialHighlight.updateMany({
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

      void this.logger.info('Destaque social atualizado', {
        socialHighlightId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('SocialHighlightRepository.update falhou', {
        error: String(error),
        socialHighlightId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar destaque social');
    }
  }

  async softDelete(id: string, organizationId: string, userId: string) {
    try {
      await this.prisma.socialHighlight.updateMany({
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

      void this.logger.info('Destaque social removido', {
        socialHighlightId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('SocialHighlightRepository.softDelete falhou', {
        error: String(error),
        socialHighlightId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover destaque social');
    }
  }
}
