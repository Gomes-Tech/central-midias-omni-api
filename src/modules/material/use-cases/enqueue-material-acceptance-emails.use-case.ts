import { LoggerService } from '@infrastructure/log';
import {
  MATERIAL_ACCEPTANCE_EMAIL_JOB,
  MATERIAL_ACCEPTANCE_EMAIL_QUEUE,
} from '@infrastructure/queue';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MaterialAcceptanceEmailJobPayload } from '../queue/material-acceptance-email.job';
import { MaterialRepository } from '../repository';

@Injectable()
export class EnqueueMaterialAcceptanceEmailsUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    @InjectQueue(MATERIAL_ACCEPTANCE_EMAIL_QUEUE)
    private readonly materialAcceptanceEmailQueue: Queue<MaterialAcceptanceEmailJobPayload>,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
  ): Promise<{ enqueued: number }> {
    const material = await this.materialRepository.findById(
      materialId,
      organizationId,
    );

    if (!material?.requiresAcceptance) {
      return { enqueued: 0 };
    }

    const eligibleMembers =
      await this.materialRepository.findEligibleMembersForCategory(
        organizationId,
        material.categoryId,
      );

    if (!eligibleMembers.length) {
      void this.logger.info('Nenhum membro elegível para notificação de material', {
        materialId,
        organizationId,
      });
      return { enqueued: 0 };
    }

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? '';
    const materialLink = frontendUrl
      ? `${frontendUrl}/materials/${materialId}`
      : undefined;

    let enqueued = 0;

    for (const member of eligibleMembers) {
      const payload: MaterialAcceptanceEmailJobPayload = {
        materialId,
        organizationId,
        userId: member.userId,
        email: member.email,
        name: member.name,
        materialName: material.name,
        materialLink,
      };

      await this.materialAcceptanceEmailQueue.add(
        MATERIAL_ACCEPTANCE_EMAIL_JOB,
        payload,
        {
          jobId: `${materialId}:${member.userId}`,
        },
      );

      enqueued += 1;
    }

    void this.logger.info('E-mails de aceite de material enfileirados', {
      materialId,
      organizationId,
      enqueued,
    });

    return { enqueued };
  }
}
