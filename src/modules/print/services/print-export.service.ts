import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { PRINT_EXPORT_JOB, PRINT_EXPORT_QUEUE } from '@infrastructure/queue';
import { MaterialRepository } from '@modules/material/repository';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  MaterialTemplateStatus,
  Prisma,
  PrintExportStatus,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { posix } from 'node:path';
import type { CreatePrintExportDTO } from '../dto';
import type { PrintExportResponse } from '../entities';
import type { PrintExportJobPayload } from '../queue/print-export.job';
import {
  PrintableDocument,
  PrintDocumentService,
} from './print-document.service';
import { PrintPreflightService } from './print-preflight.service';
import { toPrintPresetSnapshot } from './print-preset-snapshot';
import {
  PreparedPrintImage,
  PrintImageInputService,
} from './print-image-input.service';

@Injectable()
export class PrintExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialRepository: MaterialRepository,
    private readonly documents: PrintDocumentService,
    private readonly preflight: PrintPreflightService,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
    @InjectQueue(PRINT_EXPORT_QUEUE)
    private readonly queue: Queue<PrintExportJobPayload>,
    private readonly imageInputs: PrintImageInputService,
  ) {}

  async create(
    materialId: string,
    organizationId: string,
    userId: string,
    dto: CreatePrintExportDTO,
    files: Express.Multer.File[] = [],
  ): Promise<PrintExportResponse> {
    if (process.env.PRINT_EXPORT_ENABLED !== 'true') {
      throw new BadRequestException(
        'A exportação para impressão está temporariamente indisponível',
      );
    }
    const template = await this.prisma.materialTemplate.findFirst({
      where: {
        materialId,
        organizationId,
        status: MaterialTemplateStatus.PUBLISHED,
      },
      include: {
        printPreset: { include: { colorProfile: true } },
      },
    });
    if (!template?.document || !template.printPreset) {
      throw new NotFoundException('Template de impressão não encontrado');
    }
    const hasAccess = await this.materialRepository.userHasCategoryAccess(
      organizationId,
      (
        await this.prisma.material.findUniqueOrThrow({
          where: { id: materialId },
          select: { categoryId: true },
        })
      ).categoryId,
      userId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Você não possui acesso a este material');
    }

    const document = this.documents.validateCustomizedDocument(
      template.document,
      dto.document,
    );
    const images = this.imageInputs.prepare(
      document,
      dto.imageBindings ?? [],
      files,
    );
    const documentHash = this.documents.hash(document, images);
    const existing = await this.prisma.printExport.findFirst({
      where: { organizationId, userId, idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      if (
        existing.materialId !== materialId ||
        existing.documentHash !== documentHash
      ) {
        throw new ConflictException(
          'A chave de idempotência já foi usada em outra exportação',
        );
      }
      return this.response(
        await this.recoverExportJobIfNeeded(existing, document, images),
      );
    }

    const preflight = await this.preflight.run(materialId, organizationId);
    if (preflight.status !== 'READY') {
      throw new BadRequestException(
        preflight.issues[0]?.message ??
          'O template não está pronto para impressão',
      );
    }
    const snapshot = toPrintPresetSnapshot(template.printPreset);
    this.imageInputs.validateDpi(document, images, snapshot);
    let record;
    try {
      record = await this.prisma.printExport.create({
        data: {
          id: generateId(),
          organizationId,
          materialId,
          templateId: template.id,
          userId,
          idempotencyKey: dto.idempotencyKey,
          templateRevision: template.revision,
          documentHash,
          presetSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
      const concurrent = await this.prisma.printExport.findFirst({
        where: { organizationId, userId, idempotencyKey: dto.idempotencyKey },
      });
      if (
        !concurrent ||
        concurrent.materialId !== materialId ||
        concurrent.documentHash !== documentHash
      ) {
        throw new ConflictException(
          'A chave de idempotência já foi usada em outra exportação',
        );
      }
      return this.response(
        await this.recoverExportJobIfNeeded(concurrent, document, images),
      );
    }
    await this.enqueueExportJob(record, document, images);
    void this.logger.info('Exportação para impressão enfileirada', {
      exportId: record.id,
      materialId,
      organizationId,
      userId,
    });
    return this.response(record);
  }

  async get(id: string, organizationId: string, userId: string) {
    const record = await this.findOwned(id, organizationId, userId);
    if (
      record.status === 'COMPLETED' &&
      record.expiresAt &&
      record.expiresAt <= new Date()
    ) {
      await this.expire(record);
      return this.response({ ...record, status: 'EXPIRED' });
    }
    return this.response(record);
  }

  async download(id: string, organizationId: string, userId: string) {
    const record = await this.findOwned(id, organizationId, userId);
    if (
      record.status !== 'COMPLETED' ||
      !record.fileKey ||
      !record.expiresAt ||
      record.expiresAt <= new Date()
    ) {
      if (
        record.fileKey &&
        record.expiresAt &&
        record.expiresAt <= new Date()
      ) {
        await this.expire(record);
      }
      throw new BadRequestException('O PDF ainda não está disponível');
    }
    await this.materialRepository.registerDownload(record.materialId, userId);
    await this.prisma.printExport.update({
      where: { id: record.id },
      data: { downloadedAt: new Date() },
    });
    return {
      url: await this.storage.getDownloadUrl(
        record.fileKey,
        `${posix.basename(record.fileKey, '.pdf')}.pdf`,
      ),
      expiresAt: record.expiresAt,
    };
  }

  async expireCompletedFiles(now = new Date()) {
    const expired = await this.prisma.printExport.findMany({
      where: {
        status: 'COMPLETED',
        expiresAt: { lte: now },
        fileKey: { not: null },
      },
      select: { id: true, fileKey: true },
      take: 100,
    });
    for (const record of expired) {
      await this.expire(record);
    }
    return expired.length;
  }

  private async findOwned(id: string, organizationId: string, userId: string) {
    const record = await this.prisma.printExport.findFirst({
      where: { id, organizationId, userId },
    });
    if (!record) throw new NotFoundException('Exportação não encontrada');
    return record;
  }

  private async expire(record: { id: string; fileKey: string | null }) {
    if (record.fileKey) {
      await this.storage.deleteFile([record.fileKey]).catch(() => undefined);
    }
    await this.prisma.printExport.update({
      where: { id: record.id },
      data: { status: 'EXPIRED', fileKey: null },
    });
  }

  private isRecoverableStatus(status: PrintExportStatus): boolean {
    return (
      status === PrintExportStatus.QUEUED || status === PrintExportStatus.FAILED
    );
  }

  private async recoverExportJobIfNeeded(
    record: {
      id: string;
      status: PrintExportStatus;
      progress: number;
      errorCode: string | null;
      errorMessage: string | null;
      materialId: string;
      size: number | null;
      expiresAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
      organizationId: string;
      userId: string;
      presetSnapshot: Prisma.JsonValue;
    },
    document: PrintableDocument,
    images: PreparedPrintImage[],
  ) {
    if (!this.isRecoverableStatus(record.status)) {
      return record;
    }

    this.imageInputs.validateDpi(
      document,
      images,
      record.presetSnapshot as unknown as import('../entities').PrintPresetSnapshot,
    );
    const activeJob = await this.queue.getJob(record.id);
    if (
      activeJob &&
      !['failed', 'completed', 'unknown'].includes(await activeJob.getState())
    ) {
      return record;
    }
    let current = record;
    if (record.status === PrintExportStatus.FAILED) {
      current = await this.prisma.printExport.update({
        where: { id: record.id },
        data: {
          status: PrintExportStatus.QUEUED,
          progress: 0,
          errorCode: null,
          errorMessage: null,
        },
      });
    }

    await this.enqueueExportJob(record, document, images);
    return current;
  }

  private async enqueueExportJob(
    record: { id: string; organizationId: string; userId: string },
    document: PrintableDocument,
    images: PreparedPrintImage[],
  ): Promise<void> {
    const exportId = record.id;
    const existingJob = await this.queue.getJob(exportId);
    if (existingJob) {
      const state = await existingJob.getState();
      if (state !== 'failed' && state !== 'completed' && state !== 'unknown') {
        return;
      }
      await existingJob.remove();
    }

    let inputIds: string[] = [];
    try {
      inputIds = await this.imageInputs.stage(record, images);
      const competingJob = await this.queue.getJob(exportId);
      if (competingJob) {
        await this.imageInputs.cleanup(inputIds);
        return;
      }
      await this.queue.add(
        PRINT_EXPORT_JOB,
        { exportId, document, ...(inputIds.length ? { inputIds } : {}) },
        { jobId: exportId },
      );
      // BullMQ may return the caller's payload even when another request won.
      const accepted = await this.queue.getJob(exportId);
      if (
        accepted &&
        inputIds.some((id) => !accepted.data.inputIds?.includes(id))
      ) {
        await this.imageInputs.cleanup(inputIds);
      }
    } catch (error) {
      // A Redis timeout can happen after accepting the job: preserve its inputs.
      const queued = await this.queue.getJob(exportId).catch(() => undefined);
      if (queued) {
        if (inputIds.some((id) => !queued.data.inputIds?.includes(id)))
          await this.imageInputs.cleanup(inputIds);
        return;
      }
      if (queued === null) await this.imageInputs.cleanup(inputIds);
      // Unknown queue outcome remains recoverable as QUEUED; TTL cleans orphans.
      throw error;
    }
  }

  private response(record: any): PrintExportResponse {
    return {
      id: record.id,
      materialId: record.materialId,
      status: record.status,
      progress: record.progress,
      errorCode: record.errorCode,
      errorMessage: record.errorMessage,
      size: record.size,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
