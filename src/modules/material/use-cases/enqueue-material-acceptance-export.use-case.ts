import { BadRequestException, NotFoundException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import {
  MATERIAL_ACCEPTANCE_EXPORT_JOB,
  MATERIAL_ACCEPTANCE_EXPORT_QUEUE,
} from '@infrastructure/queue';
import { FindUserByIdUseCase } from '@modules/user';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { MaterialAcceptanceExportJobPayload } from '../queue/material-acceptance-export.job';
import { MaterialRepository } from '../repository';

@Injectable()
export class EnqueueMaterialAcceptanceExportUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    @InjectQueue(MATERIAL_ACCEPTANCE_EXPORT_QUEUE)
    private readonly materialAcceptanceExportQueue: Queue<MaterialAcceptanceExportJobPayload>,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
  ): Promise<{ enqueued: boolean }> {
    const material = await this.materialRepository.findById(
      materialId,
      organizationId,
    );

    if (!material) {
      throw new NotFoundException('Material não encontrado');
    }

    if (!material.requiresAcceptance) {
      throw new BadRequestException(
        'Este material não exige confirmação de leitura',
      );
    }

    const user = await this.findUserByIdUseCase.execute(userId);

    const payload: MaterialAcceptanceExportJobPayload = {
      materialId,
      organizationId,
      userId,
      email: user.email,
      name: user.name,
    };

    await this.materialAcceptanceExportQueue.add(
      MATERIAL_ACCEPTANCE_EXPORT_JOB,
      payload,
      {
        jobId: `${materialId}:${userId}:export`,
      },
    );

    void this.logger.info('Exportação de relatório de aceite enfileirada', {
      materialId,
      organizationId,
      userId,
    });

    return { enqueued: true };
  }
}
