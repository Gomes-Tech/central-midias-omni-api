import { ConflictException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { PRINT_EXPORT_JOB } from '@infrastructure/queue';
import { MaterialRepository } from '@modules/material/repository';
import { PrintExportStatus } from '@prisma/client';
import { PrintDocumentService } from './print-document.service';
import { PrintExportService } from './print-export.service';
import { PrintPreflightService } from './print-preflight.service';

jest.mock('./print-preflight.service', () => ({
  PrintPreflightService: class PrintPreflightService {},
}));

describe('PrintExportService', () => {
  const originalEnabled = process.env.PRINT_EXPORT_ENABLED;
  const now = new Date('2026-09-10T12:00:00.000Z');
  const document = { schemaVersion: 2 } as never;
  const dto = { document, idempotencyKey: 'key-1' };

  const queuedRecord = {
    id: 'export-1',
    organizationId: 'org-1',
    materialId: 'mat-1',
    templateId: 'tpl-1',
    userId: 'user-1',
    idempotencyKey: 'key-1',
    documentHash: 'hash-1',
    status: PrintExportStatus.QUEUED,
    progress: 0,
    errorCode: null,
    errorMessage: null,
    size: null,
    expiresAt: null,
    createdAt: now,
    updatedAt: now,
  };

  let prisma: {
    materialTemplate: { findFirst: jest.Mock };
    material: { findUniqueOrThrow: jest.Mock };
    printExport: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let materialRepository: jest.Mocked<
    Pick<MaterialRepository, 'userHasCategoryAccess'>
  >;
  let documents: jest.Mocked<
    Pick<PrintDocumentService, 'validateCustomizedDocument' | 'hash'>
  >;
  let preflight: jest.Mocked<Pick<PrintPreflightService, 'run'>>;
  let queue: {
    add: jest.Mock;
    getJob: jest.Mock;
  };
  let service: PrintExportService;

  beforeEach(() => {
    process.env.PRINT_EXPORT_ENABLED = 'true';

    prisma = {
      materialTemplate: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tpl-1',
          document,
          revision: 1,
          printPreset: {
            id: 'preset-1',
            name: 'A4',
            trimWidthMm: 210,
            trimHeightMm: 297,
            bleedTopMm: 0,
            bleedRightMm: 0,
            bleedBottomMm: 0,
            bleedLeftMm: 0,
            safeMarginTopMm: 0,
            safeMarginRightMm: 0,
            safeMarginBottomMm: 0,
            safeMarginLeftMm: 0,
            minimumDpi: 300,
            includeCropMarks: true,
            cropMarkOffsetMm: 3,
            renderingIntent: 'RELATIVE_COLORIMETRIC',
            updatedAt: now,
            colorProfile: {
              id: 'cp-1',
              name: 'ISO',
              storageKey: 'profiles/iso.icc',
              checksum: 'abc',
              outputConditionIdentifier: 'FOGRA39',
            },
          },
        }),
      },
      material: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ categoryId: 'cat-1' }),
      },
      printExport: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    materialRepository = {
      userHasCategoryAccess: jest.fn().mockResolvedValue(true),
    };
    documents = {
      validateCustomizedDocument: jest.fn().mockReturnValue(document),
      hash: jest.fn().mockReturnValue('hash-1'),
    };
    preflight = {
      run: jest.fn().mockResolvedValue({ status: 'READY', issues: [] }),
    };
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };

    service = new PrintExportService(
      prisma as unknown as PrismaService,
      materialRepository as unknown as MaterialRepository,
      documents as unknown as PrintDocumentService,
      preflight as unknown as PrintPreflightService,
      {} as StorageService,
      { info: jest.fn() } as unknown as LoggerService,
      queue as never,
    );
  });

  afterEach(() => {
    process.env.PRINT_EXPORT_ENABLED = originalEnabled;
  });

  it('deve reenfileirar exportação QUEUED órfã com a mesma chave de idempotência', async () => {
    prisma.printExport.findFirst.mockResolvedValue(queuedRecord);

    const result = await service.create('mat-1', 'org-1', 'user-1', dto);

    expect(result.id).toBe('export-1');
    expect(result.status).toBe(PrintExportStatus.QUEUED);
    expect(prisma.printExport.create).not.toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      PRINT_EXPORT_JOB,
      { exportId: 'export-1', document },
      { jobId: 'export-1' },
    );
  });

  it('não deve duplicar job quando a exportação QUEUED já estiver na fila', async () => {
    prisma.printExport.findFirst.mockResolvedValue(queuedRecord);
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('waiting'),
      remove: jest.fn(),
    });

    await service.create('mat-1', 'org-1', 'user-1', dto);

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('deve reenfileirar exportação FAILED e voltar o status para QUEUED', async () => {
    const failed = {
      ...queuedRecord,
      status: PrintExportStatus.FAILED,
      progress: 100,
      errorCode: 'PRINT_RENDER_FAILED',
      errorMessage: 'falhou',
    };
    const recovered = {
      ...queuedRecord,
      status: PrintExportStatus.QUEUED,
      progress: 0,
      errorCode: null,
      errorMessage: null,
    };
    prisma.printExport.findFirst.mockResolvedValue(failed);
    prisma.printExport.update.mockResolvedValue(recovered);

    const result = await service.create('mat-1', 'org-1', 'user-1', dto);

    expect(prisma.printExport.update).toHaveBeenCalledWith({
      where: { id: 'export-1' },
      data: {
        status: PrintExportStatus.QUEUED,
        progress: 0,
        errorCode: null,
        errorMessage: null,
      },
    });
    expect(queue.add).toHaveBeenCalledWith(
      PRINT_EXPORT_JOB,
      { exportId: 'export-1', document },
      { jobId: 'export-1' },
    );
    expect(result.status).toBe(PrintExportStatus.QUEUED);
  });

  it('não deve reenfileirar exportação COMPLETED', async () => {
    prisma.printExport.findFirst.mockResolvedValue({
      ...queuedRecord,
      status: PrintExportStatus.COMPLETED,
      progress: 100,
    });

    const result = await service.create('mat-1', 'org-1', 'user-1', dto);

    expect(result.status).toBe(PrintExportStatus.COMPLETED);
    expect(queue.add).not.toHaveBeenCalled();
    expect(queue.getJob).not.toHaveBeenCalled();
  });

  it('deve rejeitar chave de idempotência reutilizada em outro documento', async () => {
    prisma.printExport.findFirst.mockResolvedValue({
      ...queuedRecord,
      documentHash: 'outro-hash',
    });

    await expect(
      service.create('mat-1', 'org-1', 'user-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('deve ignorar job failed residual e enfileirar de novo', async () => {
    prisma.printExport.findFirst.mockResolvedValue(queuedRecord);
    const remove = jest.fn().mockResolvedValue(undefined);
    queue.getJob.mockResolvedValue({
      getState: jest.fn().mockResolvedValue('failed'),
      remove,
    });

    await service.create('mat-1', 'org-1', 'user-1', dto);

    expect(remove).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      PRINT_EXPORT_JOB,
      { exportId: 'export-1', document },
      { jobId: 'export-1' },
    );
  });
});
