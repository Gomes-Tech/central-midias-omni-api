import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateEventDTO,
  FindAllEventsFiltersDTO,
  UpdateEventDTO,
} from '../dto';
import {
  CalendarEventEntity,
  CalendarEventMaterialSummary,
} from '../entities';

const materialSummarySelect = {
  id: true,
  name: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      slugPath: true,
      categoryRoleAccesses: {
        select: {
          roleId: true,
        },
      },
    },
  },
} satisfies Prisma.MaterialSelect;

type RawMaterialSummary = Prisma.MaterialGetPayload<{
  select: typeof materialSummarySelect;
}>;

function mapMaterialSummary(
  material: RawMaterialSummary,
): CalendarEventMaterialSummary {
  return {
    id: material.id,
    name: material.name,
    category: {
      id: material.category.id,
      name: material.category.name,
      slug: material.category.slug,
      slugPath: material.category.slugPath,
    },
  };
}

function isMaterialAccessibleToRole(
  material: RawMaterialSummary,
  roleId: string,
): boolean {
  const accesses = material.category.categoryRoleAccesses;

  if (accesses.length === 0) {
    return true;
  }

  return accesses.some((access) => access.roleId === roleId);
}

const eventSelect = {
  id: true,
  organizationId: true,
  title: true,
  description: true,
  startDate: true,
  endDate: true,
  externalUrl: true,
  eventTypeId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  eventType: {
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
    },
  },
  materials: {
    select: {
      material: {
        select: materialSummarySelect,
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.CalendarEventSelect;

type RawEventRow = Prisma.CalendarEventGetPayload<{
  select: typeof eventSelect;
}>;

function mapEventRow(
  row: RawEventRow,
  roleId?: string,
): CalendarEventEntity {
  const rawMaterials = row.materials.map((link) => link.material);
  const materials =
    roleId !== undefined
      ? rawMaterials
          .filter((material) => isMaterialAccessibleToRole(material, roleId))
          .map(mapMaterialSummary)
      : rawMaterials.map(mapMaterialSummary);

  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    externalUrl: row.externalUrl,
    eventTypeId: row.eventTypeId,
    eventType: row.eventType,
    materials,
    createdBy: row.createdBy,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildAccessibleMaterialCategoryFilter(
  organizationId: string,
  roleId: string,
): Prisma.CategoryWhereInput {
  return {
    organizationId,
    isDeleted: false,
    OR: [
      { categoryRoleAccesses: { none: {} } },
      {
        categoryRoleAccesses: {
          some: { roleId, organizationId },
        },
      },
    ],
  };
}

function buildPortalVisibilityFilter(
  organizationId: string,
  roleId: string,
): Prisma.CalendarEventWhereInput {
  const accessibleCategory = buildAccessibleMaterialCategoryFilter(
    organizationId,
    roleId,
  );

  return {
    OR: [
      { materials: { none: {} } },
      {
        materials: {
          some: {
            material: {
              deletedAt: null,
              category: accessibleCategory,
            },
          },
        },
      },
    ],
  };
}

@Injectable()
export class EventRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    organizationId: string,
    filters: FindAllEventsFiltersDTO = {},
    visibility?: {
      canAccessBackoffice: boolean;
      roleId: string;
    },
  ): Promise<CalendarEventEntity[]> {
    try {
      const andFilters: Prisma.CalendarEventWhereInput[] = [];

      if (filters.from && filters.to) {
        andFilters.push({
          startDate: { lte: filters.to },
          endDate: { gte: filters.from },
        });
      } else if (filters.from) {
        andFilters.push({ endDate: { gte: filters.from } });
      } else if (filters.to) {
        andFilters.push({ startDate: { lte: filters.to } });
      }

      if (visibility && !visibility.canAccessBackoffice) {
        andFilters.push(
          buildPortalVisibilityFilter(organizationId, visibility.roleId),
        );
      }

      const where: Prisma.CalendarEventWhereInput = {
        organizationId,
        isDeleted: false,
        ...(typeof filters.isActive === 'boolean'
          ? { isActive: filters.isActive }
          : { isActive: true }),
        ...(filters.eventTypeId && { eventTypeId: filters.eventTypeId }),
        ...(filters.searchTerm && {
          OR: [
            {
              title: {
                contains: filters.searchTerm,
                mode: 'insensitive' as const,
              },
            },
            {
              description: {
                contains: filters.searchTerm,
                mode: 'insensitive' as const,
              },
            },
          ],
        }),
        ...(andFilters.length > 0 ? { AND: andFilters } : {}),
      };

      const rows = await this.prisma.calendarEvent.findMany({
        where,
        orderBy: [{ startDate: 'asc' }, { title: 'asc' }],
        select: eventSelect,
      });

      return rows.map((row) =>
        mapEventRow(
          row,
          visibility && !visibility.canAccessBackoffice
            ? visibility.roleId
            : undefined,
        ),
      );
    } catch (error) {
      void this.logger.error('EventRepository.findAll falhou', {
        error: String(error),
        organizationId,
        filters,
      });

      throw new BadRequestException('Erro ao buscar eventos');
    }
  }

  async findById(
    id: string,
    organizationId: string,
    roleId?: string,
  ): Promise<CalendarEventEntity | null> {
    try {
      const row = await this.prisma.calendarEvent.findFirst({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        select: eventSelect,
      });

      return row ? mapEventRow(row, roleId) : null;
    } catch (error) {
      void this.logger.error('EventRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar evento');
    }
  }

  async create(
    organizationId: string,
    data: CreateEventDTO,
    userId: string,
  ): Promise<CalendarEventEntity> {
    try {
      const materialIds = data.materialIds ?? [];

      const created = await this.prisma.calendarEvent.create({
        data: {
          id: generateId(),
          organizationId,
          title: data.title,
          description: data.description,
          startDate: data.startDate,
          endDate: data.endDate,
          eventTypeId: data.eventTypeId,
          externalUrl: data.externalUrl ?? null,
          isActive: data.isActive ?? true,
          createdByUserId: userId,
          ...(materialIds.length > 0 && {
            materials: {
              create: materialIds.map((materialId) => ({ materialId })),
            },
          }),
        },
        select: eventSelect,
      });

      void this.logger.info('Evento criado', {
        organizationId,
        userId,
        eventId: created.id,
        title: data.title,
      });

      return mapEventRow(created);
    } catch (error) {
      void this.logger.error('EventRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        title: data.title,
      });

      throw new BadRequestException('Erro ao criar evento');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateEventDTO,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.calendarEvent.updateMany({
          where: {
            id,
            organizationId,
            isDeleted: false,
          },
          data: {
            ...(data.title !== undefined && { title: data.title }),
            ...(data.description !== undefined && {
              description: data.description,
            }),
            ...(data.startDate !== undefined && { startDate: data.startDate }),
            ...(data.endDate !== undefined && { endDate: data.endDate }),
            ...(data.eventTypeId !== undefined && {
              eventTypeId: data.eventTypeId,
            }),
            ...(data.externalUrl !== undefined && {
              externalUrl: data.externalUrl,
            }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
          },
        });

        if (data.materialIds !== undefined) {
          await tx.calendarEventMaterial.deleteMany({
            where: { eventId: id },
          });

          if (data.materialIds.length > 0) {
            await tx.calendarEventMaterial.createMany({
              data: data.materialIds.map((materialId) => ({
                eventId: id,
                materialId,
              })),
            });
          }
        }
      });

      void this.logger.info('Evento atualizado', {
        eventId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('EventRepository.update falhou', {
        error: String(error),
        eventId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar evento');
    }
  }

  async softDelete(
    id: string,
    organizationId: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.prisma.calendarEvent.updateMany({
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

      void this.logger.info('Evento removido', {
        eventId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('EventRepository.softDelete falhou', {
        error: String(error),
        eventId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover evento');
    }
  }

  async findActiveMaterialsInOrg(
    materialIds: string[],
    organizationId: string,
  ): Promise<Array<{ id: string }>> {
    if (materialIds.length === 0) {
      return [];
    }

    try {
      return await this.prisma.material.findMany({
        where: {
          id: { in: materialIds },
          deletedAt: null,
          category: {
            organizationId,
            isDeleted: false,
            isActive: true,
          },
        },
        select: { id: true },
      });
    } catch (error) {
      void this.logger.error(
        'EventRepository.findActiveMaterialsInOrg falhou',
        {
          error: String(error),
          materialIds,
          organizationId,
        },
      );

      throw new BadRequestException('Erro ao validar materiais');
    }
  }

  async isVisibleToPortalUser(
    eventId: string,
    organizationId: string,
    roleId: string,
  ): Promise<boolean> {
    const count = await this.prisma.calendarEvent.count({
      where: {
        id: eventId,
        organizationId,
        isDeleted: false,
        AND: [buildPortalVisibilityFilter(organizationId, roleId)],
      },
    });

    return count > 0;
  }
}
