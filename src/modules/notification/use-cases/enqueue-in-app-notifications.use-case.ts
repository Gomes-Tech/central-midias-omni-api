import { LoggerService } from '@infrastructure/log';
import { MaterialRepository } from '@modules/material/repository';
import { Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../entities';
import { InAppNotificationJobPayload } from '../queue/in-app-notification.job';
import { CreateInAppNotificationUseCase } from './create-in-app-notification.use-case';

type EnqueueMaterialInAppNotificationsInput = {
  materialId: string;
  organizationId: string;
  type: Extract<NotificationType, 'MATERIAL_CREATED' | 'MATERIAL_UPDATED'>;
  roleId?: string;
  actorUserId?: string;
};

@Injectable()
export class EnqueueInAppNotificationsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly createInAppNotificationUseCase: CreateInAppNotificationUseCase,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    input: EnqueueMaterialInAppNotificationsInput,
  ): Promise<{ enqueued: number }> {
    const material = await this.materialRepository.findById(
      input.materialId,
      input.organizationId,
    );

    if (!material) {
      return { enqueued: 0 };
    }

    const eligibleMembers =
      await this.materialRepository.findEligibleMembersForCategory(
        input.organizationId,
        material.categoryId,
      );

    if (!eligibleMembers.length) {
      void this.logger.info(
        'Nenhum membro elegível para notificação in-app de material',
        {
          materialId: input.materialId,
          organizationId: input.organizationId,
        },
      );
      return { enqueued: 0 };
    }

    const isUpdate = input.type === 'MATERIAL_UPDATED';
    const title = isUpdate
      ? 'Material atualizado'
      : 'Novo material disponível';
    const body = `${material.name} · ${material.category.name}`;
    const href = `/material/${material.id}`;
    const dedupeSuffix = isUpdate
      ? `:${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`
      : '';

    let enqueued = 0;

    for (const member of eligibleMembers) {
      const dedupeKey = `${input.type}:${input.organizationId}:${material.id}:${member.userId}${dedupeSuffix}`;
      const payload: InAppNotificationJobPayload = {
        organizationId: input.organizationId,
        userId: member.userId,
        type: input.type,
        title,
        body,
        href,
        resourceType: 'material',
        resourceId: material.id,
        actorUserId: input.actorUserId,
        dedupeKey,
      };

      try {
        await this.createInAppNotificationUseCase.execute(payload);
        enqueued += 1;
      } catch (error) {
        void this.logger.error(
          'Falha ao criar notificação in-app de material',
          {
            materialId: input.materialId,
            organizationId: input.organizationId,
            userId: member.userId,
            error: String(error),
          },
        );
      }
    }

    void this.logger.info('Notificações in-app de material criadas', {
      materialId: input.materialId,
      organizationId: input.organizationId,
      enqueued,
    });

    return { enqueued };
  }
}
