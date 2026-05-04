import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateTagDTO, FindAllTagsFiltersDTO, UpdateTagDTO } from '../dto';
import { TagEntity } from '../entities';

const tagSelect = {
  id: true,
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

  async findAll(filters: FindAllTagsFiltersDTO = {}): Promise<TagEntity[]> {
    try {
      const tags = await this.prisma.tag.findMany({
        where: {
          ...(filters.searchTerm && {
            name: {
              contains: filters.searchTerm,
              mode: 'insensitive',
            },
          }),
        },
        select: tagSelect,
        orderBy: [{ name: 'asc' }],
      });

      return tags.map((tag) => this.mapTag(tag));
    } catch (error) {
      void this.logger.error('TagRepository.findAll falhou', {
        error: String(error),
        filters,
      });

      throw new BadRequestException('Erro ao buscar tags');
    }
  }

  async findById(id: string): Promise<TagEntity | null> {
    try {
      const tag = await this.prisma.tag.findUnique({
        where: { id },
        select: tagSelect,
      });

      return tag ? this.mapTag(tag) : null;
    } catch (error) {
      void this.logger.error('TagRepository.findById falhou', {
        error: String(error),
        id,
      });

      throw new BadRequestException('Erro ao buscar tag');
    }
  }

  async findByName(name: string): Promise<{ id: string; name: string } | null> {
    try {
      return await this.prisma.tag.findFirst({
        where: {
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
      });

      throw new BadRequestException('Erro ao buscar tag');
    }
  }

  async create(data: CreateTagDTO): Promise<TagEntity> {
    try {
      const createdTag = await this.prisma.tag.create({
        data: {
          name: data.name,
        },
        select: tagSelect,
      });

      void this.logger.info('Tag criada', {
        tagId: createdTag.id,
        tagName: createdTag.name,
      });

      return this.mapTag(createdTag);
    } catch (error) {
      void this.logger.error('TagRepository.create falhou', {
        error: String(error),
        data,
      });

      throw new BadRequestException('Erro ao criar tag');
    }
  }

  async update(id: string, data: UpdateTagDTO): Promise<TagEntity> {
    try {
      const updatedTag = await this.prisma.tag.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
        },
        select: tagSelect,
      });

      void this.logger.info('Tag atualizada', {
        tagId: updatedTag.id,
      });

      return this.mapTag(updatedTag);
    } catch (error) {
      void this.logger.error('TagRepository.update falhou', {
        error: String(error),
        id,
        data,
      });

      throw new BadRequestException('Erro ao atualizar tag');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.tag.delete({
        where: { id },
      });

      void this.logger.info('Tag removida', {
        tagId: id,
      });
    } catch (error) {
      void this.logger.error('TagRepository.delete falhou', {
        error: String(error),
        id,
      });

      throw new BadRequestException('Erro ao remover tag');
    }
  }

  private mapTag(tag: TagRow): TagEntity {
    return {
      id: tag.id,
      name: tag.name,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
      materialsCount: tag._count.material,
      tagSearchesCount: tag._count.tagSearches,
    };
  }
}
