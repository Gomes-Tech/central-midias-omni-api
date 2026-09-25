import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { PRINT_EXPORT_JOB, PRINT_EXPORT_QUEUE } from '@infrastructure/queue';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { OnModuleInit } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import type { PrintExportJobPayload } from './print-export.job';
import { PRINT_EXPORT_CLEANUP_JOB } from './print-export.job';
import { PrintRendererService } from '../services/print-renderer.service';
import { PrintExportService } from '../services/print-export.service';
import { PrintImageInputService } from '../services/print-image-input.service';

@Processor(PRINT_EXPORT_QUEUE, { concurrency: 1 })
export class PrintExportProcessor extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PrintRendererService,
    private readonly exports: PrintExportService,
    private readonly logger: LoggerService,
    @InjectQueue(PRINT_EXPORT_QUEUE)
    private readonly queue: Queue,
    private readonly imageInputs: PrintImageInputService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.queue.add(
      PRINT_EXPORT_CLEANUP_JOB,
      {},
      {
        jobId: 'print-export-cleanup',
        repeat: { every: 60 * 60 * 1000 },
      },
    );
  }

  async process(job: Job<PrintExportJobPayload | Record<string, never>>) {
    if (job.name === PRINT_EXPORT_CLEANUP_JOB) {
      await this.exports.expireCompletedFiles();
      await this.imageInputs.expireInputs();
      return;
    }
    if (job.name !== PRINT_EXPORT_JOB) return;
    const {
      exportId,
      document,
      inputIds = [],
    } = job.data as PrintExportJobPayload;
    const startedAt = Date.now();
    try {
      await this.prisma.printExport.update({
        where: { id: exportId },
        data: {
          status: 'PROCESSING',
          progress: 10,
          errorCode: null,
          errorMessage: null,
        },
      });
      await job.updateProgress(10);
      const artifact = await this.renderer.render(
        exportId,
        document,
        async (progress) => {
          await Promise.all([
            this.prisma.printExport.update({
              where: { id: exportId },
              data: { progress },
            }),
            job.updateProgress(progress),
          ]);
        },
        inputIds,
      );
      await this.prisma.printExport.update({
        where: { id: exportId },
        data: { status: 'COMPLETED', progress: 100, ...artifact },
      });
      await job.updateProgress(100).catch(() => undefined);
      await this.imageInputs.cleanup(inputIds);
      void this.logger.info('Exportação para impressão concluída', {
        exportId,
        checksum: artifact.checksum,
        size: artifact.size,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      await this.prisma.printExport
        .updateMany({
          where: { id: exportId },
          data: {
            status: finalAttempt ? 'FAILED' : 'QUEUED',
            progress: 100,
            errorCode: 'PRINT_RENDER_FAILED',
            errorMessage: 'Não foi possível gerar o PDF para impressão.',
          },
        })
        .catch(() => undefined);
      if (finalAttempt) await this.imageInputs.cleanup(inputIds);
      void this.logger.error('Falha ao gerar exportação para impressão', {
        exportId,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }
  }
}
