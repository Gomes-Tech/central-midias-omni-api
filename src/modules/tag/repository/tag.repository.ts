import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import { CreateTagDTO, FindAllTagsFiltersDTO, UpdateTagDTO } from '../dto';
import { TagEntity } from '../entities';

const tagSelect = {
  id: true,
  organizationId: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      material: true,
      tagSearches: true,
    },
  },
} satisfies Prisma.TagSelect;

type TagRow = Prisma.TagGetPayload<{
  select: typeof tagSelect;
}>;

@Injectable()
export class TagRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllTagsFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<TagEntity>> {
    const { page = 1, limit = 25, searchTerm } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.TagWhereInput = {
        organizationId,
        ...(searchTerm && {
          name: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        }),
      };

      const [tags, total] = await Promise.all([
        this.prisma.tag.findMany({
          where,
          select: tagSelect,
          orderBy: [{ name: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.tag.count({ where }),
      ]);

      return {
        data: tags.map((tag) => this.mapTag(tag)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('TagRepository.findAll falhou', {
        error: String(error),
        organizationId,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar tags');
    }
  }

  async findSelect(
    organizationId: string,
  ): Promise<{ id: string; name: string }[]> {
    try {
      return await this.prisma.tag.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    } catch (error) {
      void this.logger.error('TagRepository.findSelect falhou', {
        error: String(error),
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tags');
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<TagEntity | null> {
    try {
      const tag = await this.prisma.tag.findFirst({
        where: { id, organizationId },
        select: tagSelect,
      });

      return tag ? this.mapTag(tag) : null;
    } catch (error) {
      void this.logger.error('TagRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tag');
    }
  }

  async findByName(
    name: string,
    organizationId: string,
  ): Promise<{ id: string; name: string } | null> {
    try {
      return await this.prisma.tag.findFirst({
        where: {
          organizationId,
          name: {
            equals: name,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      void this.logger.error('TagRepository.findByName falhou', {
        error: String(error),
        name,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tag');
    }
  }

  async findManyByIds(
    ids: string[],
    organizationId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    if (!ids.length) {
      return [];
    }

    try {
      return await this.prisma.tag.findMany({
        where: {
          organizationId,
          id: {
            in: ids,
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    } catch (error) {
      void this.logger.error('TagRepository.findManyByIds falhou', {
        error: String(error),
        ids,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tags');
    }
  }

  async findManyByNames(
    names: string[],
    organizationId: string,
  ): Promise<Array<{ id: string; name: string }>> {
    if (!names.length) {
      return [];
    }

    try {
      return await this.prisma.tag.findMany({
        where: {
          organizationId,
          OR: names.map((name) => ({
            name: {
              equals: name,
              mode: 'insensitive',
            },
          })),
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    } catch (error) {
      void this.logger.error('TagRepository.findManyByNames falhou', {
        error: String(error),
        names,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tags');
    }
  }

  async create(organizationId: string, data: CreateTagDTO): Promise<TagEntity> {
    try {
      const createdTag = await this.prisma.tag.create({
        data: {
          id: generateId(),
          organizationId,
          name: data.name,
        },
        select: tagSelect,
      });

      void this.logger.info('Tag criada', {
        tagId: createdTag.id,
        tagName: createdTag.name,
        organizationId,
      });

      return this.mapTag(createdTag);
    } catch (error) {
      void this.logger.error('TagRepository.create falhou', {
        error: String(error),
        organizationId,
        data,
      });

      throw new BadRequestException('Erro ao criar tag');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateTagDTO,
  ): Promise<TagEntity> {
    try {
      await this.prisma.tag.updateMany({
        where: { id, organizationId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
        },
      });

      const updatedTag = await this.findById(id, organizationId);

      if (!updatedTag) {
        throw new BadRequestException('Erro ao atualizar tag');
      }

      void this.logger.info('Tag atualizada', {
        tagId: updatedTag.id,
        organizationId,
      });

      return updatedTag;
    } catch (error) {
      void this.logger.error('TagRepository.update falhou', {
        error: String(error),
        id,
        organizationId,
        data,
      });

      throw new BadRequestException('Erro ao atualizar tag');
    }
  }

  async delete(id: string, organizationId: string): Promise<void> {
    try {
      await this.prisma.tag.deleteMany({
        where: { id, organizationId },
      });

      void this.logger.info('Tag removida', {
        tagId: id,
        organizationId,
      });
    } catch (error) {
      void this.logger.error('TagRepository.delete falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao remover tag');
    }
  }

  private mapTag(tag: TagRow): TagEntity {
    return {
      id: tag.id,
      organizationId: tag.organizationId,
      name: tag.name,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      materialsCount: tag._count.material,
      tagSearchesCount: tag._count.tagSearches,
    };
  }
}
