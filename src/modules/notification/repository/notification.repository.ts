import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import { FindAllNotificationsFiltersDTO } from '../dto';
import { CreateNotificationInput, NotificationItem } from '../entities';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  href: true,
  resourceType: true,
  resourceId: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findByUser(
    userId: string,
    organizationId: string,
    filters: FindAllNotificationsFiltersDTO = {},
  ): Promise<PaginatedResponse<NotificationItem>> {
    const { page = 1, limit = 20, onlyUnread = false } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      organizationId,
      ...(onlyUnread ? { readAt: null } : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.notification.findMany({
          where,
          select: notificationSelect,
          orderBy: [{ createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.notification.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('NotificationRepository.findByUser falhou', {
        error: String(error),
        userId,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar notificações');
    }
  }

  async countUnread(userId: string, organizationId: string): Promise<number> {
    try {
      return await this.prisma.notification.count({
        where: {
          userId,
          organizationId,
          readAt: null,
        },
      });
    } catch (error) {
      void this.logger.error('NotificationRepository.countUnread falhou', {
        error: String(error),
        userId,
        organizationId,
      });

      throw new BadRequestException('Erro ao contar notificações não lidas');
    }
  }

  async findOwnedById(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<{ id: string; readAt: Date | null } | null> {
    try {
      return await this.prisma.notification.findFirst({
        where: { id, userId, organizationId },
        select: { id: true, readAt: true },
      });
    } catch (error) {
      void this.logger.error('NotificationRepository.findOwnedById falhou', {
        error: String(error),
        id,
        userId,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar notificação');
    }
  }

  async markAsRead(id: string, userId: string, organizationId: string) {
    try {
      await this.prisma.notification.updateMany({
        where: {
          id,
          userId,
          organizationId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    } catch (error) {
      void this.logger.error('NotificationRepository.markAsRead falhou', {
        error: String(error),
        id,
        userId,
        organizationId,
      });

      throw new BadRequestException('Erro ao marcar notificação como lida');
    }
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<number> {
    try {
      const result = await this.prisma.notification.updateMany({
        where: {
          userId,
          organizationId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });

      return result.count;
    } catch (error) {
      void this.logger.error('NotificationRepository.markAllAsRead falhou', {
        error: String(error),
        userId,
        organizationId,
      });

      throw new BadRequestException(
        'Erro ao marcar todas as notificações como lidas',
      );
    }
  }

  async create(
    input: CreateNotificationInput,
  ): Promise<NotificationItem | null> {
    try {
      return await this.prisma.notification.create({
        data: {
          organizationId: input.organizationId,
          userId: input.userId,
          type: input.type,
          title: input.title,
          body: input.body,
          href: input.href,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          actorUserId: input.actorUserId,
          dedupeKey: input.dedupeKey,
        },
        select: notificationSelect,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return null;
      }

      void this.logger.error('NotificationRepository.create falhou', {
        error: String(error),
        userId: input.userId,
        organizationId: input.organizationId,
        dedupeKey: input.dedupeKey,
      });

      throw new BadRequestException('Erro ao criar notificação');
    }
  }
}
