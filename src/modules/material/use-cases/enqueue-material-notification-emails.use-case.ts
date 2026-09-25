import { buildPortalMaterialLink } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import {
  MATERIAL_NOTIFICATION_EMAIL_JOB,
  MATERIAL_NOTIFICATION_EMAIL_QUEUE,
} from '@infrastructure/queue';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MaterialNotificationEmailJobPayload } from '../queue/material-notification-email.job';
import { MaterialRepository } from '../repository';
import {
  buildMaterialNotificationEmailContent,
  buildMaterialNotificationEmailSubject,
} from '../utils/material-notification-email-content';

@Injectable()
export class EnqueueMaterialNotificationEmailsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    @InjectQueue(MATERIAL_NOTIFICATION_EMAIL_QUEUE)
    private readonly materialNotificationEmailQueue: Queue<MaterialNotificationEmailJobPayload>,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    roleId?: string,
  ): Promise<{ enqueued: number }> {
    const material = await this.materialRepository.findById(
      materialId,
      organizationId,
    );

    if (!material) {
      return { enqueued: 0 };
    }

    const platformMembers =
      await this.materialRepository.findPlatformMembersForCategory(
        organizationId,
        material.categoryId,
        roleId,
      );

    if (!platformMembers.length) {
      void this.logger.info(
        'Nenhum membro da plataforma elegível para notificação de material',
        {
          materialId,
          organizationId,
          roleId,
        },
      );
      return { enqueued: 0 };
    }

    try {
      await this.materialRepository.createMaterialEmailDispatch({
        organizationId,
        materialId,
        materialName: material.name,
        subject: buildMaterialNotificationEmailSubject(material.name),
        content: buildMaterialNotificationEmailContent(material.name),
        recipients: platformMembers,
      });
    } catch {
      // O relatório não deve impedir o disparo dos e-mails.
    }

    const materialLink = buildPortalMaterialLink(materialId);

    let enqueued = 0;

    for (const member of platformMembers) {
      const payload: MaterialNotificationEmailJobPayload = {
        materialId,
        organizationId,
        userId: member.userId,
        email: member.email,
        name: member.name,
        materialName: material.name,
        materialLink,
      };

      await this.materialNotificationEmailQueue.add(
        MATERIAL_NOTIFICATION_EMAIL_JOB,
        payload,
        {
          jobId: `${materialId}-${member.userId}-notification`,
        },
      );

      enqueued += 1;
    }

    void this.logger.info('E-mails de notificação de material enfileirados', {
      materialId,
      organizationId,
      enqueued,
    });

    return { enqueued };
  }
}
