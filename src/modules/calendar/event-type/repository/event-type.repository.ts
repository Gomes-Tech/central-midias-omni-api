import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateEventTypeDTO,
  FindAllEventTypesFiltersDTO,
  UpdateEventTypeDTO,
} from '../dto';
import { CalendarEventTypeEntity } from '../entities';

const eventTypeSelect = {
  id: true,
  organizationId: true,
  name: true,
  slug: true,
  color: true,
  description: true,
  order: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CalendarEventTypeSelect;

@Injectable()
export class EventTypeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    organizationId: string,
    filters: FindAllEventTypesFiltersDTO = {},
  ): Promise<CalendarEventTypeEntity[]> {
    try {
      const where: Prisma.CalendarEventTypeWhereInput = {
        organizationId,
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean' && {
          isActive: filters.isActive,
        }),
        ...(filters.searchTerm && {
          OR: [
            {
              name: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
            {
              slug: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }),
      };

      return await this.prisma.calendarEventType.findMany({
        where,
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: eventTypeSelect,
      });
    } catch (error) {
      void this.logger.error('EventTypeRepository.findAll falhou', {
        error: String(error),
        organizationId,
        filters,
      });

      throw new BadRequestException('Erro ao buscar tipos de evento');
    }
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<CalendarEventTypeEntity | null> {
    try {
      return await this.prisma.calendarEventType.findFirst({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        select: eventTypeSelect,
      });
    } catch (error) {
      void this.logger.error('EventTypeRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tipo de evento');
    }
  }

  async findBySlug(
    slug: string,
    organizationId: string,
    excludeId?: string,
  ): Promise<CalendarEventTypeEntity | null> {
    try {
      return await this.prisma.calendarEventType.findFirst({
        where: {
          slug,
          organizationId,
          isDeleted: false,
          ...(excludeId && { id: { not: excludeId } }),
        },
        select: eventTypeSelect,
      });
    } catch (error) {
      void this.logger.error('EventTypeRepository.findBySlug falhou', {
        error: String(error),
        slug,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar tipo de evento');
    }
  }

  async countActiveEventsByTypeId(
    eventTypeId: string,
    organizationId: string,
  ): Promise<number> {
    try {
      return await this.prisma.calendarEvent.count({
        where: {
          eventTypeId,
          organizationId,
          isDeleted: false,
        },
      });
    } catch (error) {
      void this.logger.error(
        'EventTypeRepository.countActiveEventsByTypeId falhou',
        {
          error: String(error),
          eventTypeId,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao verificar eventos vinculados');
    }
  }

  async create(
    organizationId: string,
    data: CreateEventTypeDTO & { slug: string },
    userId: string,
  ): Promise<CalendarEventTypeEntity> {
    try {
      const created = await this.prisma.calendarEventType.create({
        data: {
          id: generateId(),
          organizationId,
          name: data.name,
          slug: data.slug,
          color: data.color,
          description: data.description ?? null,
          order: data.order ?? 0,
          isActive: data.isActive ?? true,
        },
        select: eventTypeSelect,
      });

      void this.logger.info('Tipo de evento criado', {
        organizationId,
        userId,
        eventTypeId: created.id,
        name: data.name,
      });

      return created;
    } catch (error) {
      void this.logger.error('EventTypeRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        name: data.name,
      });

      throw new BadRequestException('Erro ao criar tipo de evento');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateEventTypeDTO & { slug?: string },
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.calendarEventType.updateMany({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      void this.logger.info('Tipo de evento atualizado', {
        eventTypeId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('EventTypeRepository.update falhou', {
        error: String(error),
        eventTypeId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar tipo de evento');
    }
  }

  async softDelete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.calendarEventType.updateMany({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          isActive: false,
        },
      });

      void this.logger.info('Tipo de evento removido', {
        eventTypeId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('EventTypeRepository.softDelete falhou', {
        error: String(error),
        eventTypeId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover tipo de evento');
    }
  }
}
