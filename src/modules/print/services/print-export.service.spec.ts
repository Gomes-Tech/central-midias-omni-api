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
import { PrintImageInputService } from './print-image-input.service';
import {
  placeholderDocument,
  printImagePreset,
} from '../../../test-utils/print-image-fixtures';

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
    presetSnapshot: printImagePreset,
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
  let imageInputs: {
    prepare: jest.Mock;
    validateDpi: jest.Mock;
    stage: jest.Mock;
    cleanup: jest.Mock;
  };

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
    imageInputs = {
      prepare: jest.fn().mockReturnValue([]),
      validateDpi: jest.fn(),
      stage: jest.fn().mockResolvedValue([]),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };

    service = new PrintExportService(
      prisma as unknown as PrismaService,
      materialRepository as unknown as MaterialRepository,
      documents as unknown as PrintDocumentService,
      preflight as unknown as PrintPreflightService,
      {} as StorageService,
      { info: jest.fn() } as unknown as LoggerService,
      queue as never,
      imageInputs as unknown as PrintImageInputService,
    );
  });

  afterEach(() => {
    process.env.PRINT_EXPORT_ENABLED = originalEnabled;
  });

  it('encaminha somente referências das fotos à fila após o upload', async () => {
    prisma.printExport.create.mockResolvedValue(queuedRecord);
    documents.validateCustomizedDocument.mockReturnValue(placeholderDocument);
    const photos = [
      {
        layerId: 'photo',
        checksum: 'image-hash',
        buffer: Buffer.from('private'),
      },
    ];
    imageInputs.prepare.mockReturnValue(photos);
    imageInputs.stage.mockResolvedValue(['input-1']);
    await service.create('mat-1', 'org-1', 'user-1', dto);
    expect(documents.hash).toHaveBeenCalledWith(placeholderDocument, photos);
    expect(queue.add).toHaveBeenCalledWith(
      PRINT_EXPORT_JOB,
      {
        exportId: 'export-1',
        document: placeholderDocument,
        inputIds: ['input-1'],
      },
      { jobId: 'export-1' },
    );
    expect(imageInputs.stage.mock.invocationCallOrder[0]).toBeLessThan(
      queue.add.mock.invocationCallOrder[0],
    );
  });

  it('não grava nem enfileira imagens inválidas ou sem acesso', async () => {
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);
    await expect(
      service.create('mat-1', 'org-1', 'user-1', dto),
    ).rejects.toThrow('acesso');
    expect(imageInputs.prepare).not.toHaveBeenCalled();
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    imageInputs.prepare.mockImplementation(() => {
      throw new Error('foto inválida');
    });
    await expect(
      service.create('mat-1', 'org-1', 'user-1', dto),
    ).rejects.toThrow('foto inválida');
    expect(prisma.printExport.create).not.toHaveBeenCalled();
    expect(imageInputs.stage).not.toHaveBeenCalled();
  });

  it('limpa arquivos após falha confirmada de enfileiramento', async () => {
    prisma.printExport.create.mockResolvedValue(queuedRecord);
    imageInputs.stage.mockResolvedValue(['input-1']);
    queue.add.mockRejectedValue(new Error('Redis indisponível'));
    await expect(
      service.create('mat-1', 'org-1', 'user-1', dto),
    ).rejects.toThrow('Redis indisponível');
    expect(imageInputs.cleanup).toHaveBeenCalledWith(['input-1']);
  });

  it('reenvia fotos com novas referências ao recuperar uma exportação que falhou', async () => {
    prisma.printExport.findFirst.mockResolvedValue({
      ...queuedRecord,
      status: PrintExportStatus.FAILED,
    });
    prisma.printExport.update.mockResolvedValue(queuedRecord);
    const photos = [{ layerId: 'photo', checksum: 'same-photo' }];
    imageInputs.prepare.mockReturnValue(photos);
    imageInputs.stage.mockResolvedValue(['new-input']);
    await service.create('mat-1', 'org-1', 'user-1', dto);
    expect(imageInputs.stage).toHaveBeenCalledWith(
      expect.objectContaining({ id: queuedRecord.id }),
      photos,
    );
    expect(queue.add).toHaveBeenCalledWith(
      PRINT_EXPORT_JOB,
      { exportId: queuedRecord.id, document, inputIds: ['new-input'] },
      { jobId: queuedRecord.id },
    );
  });

  it('preserva imagens se a fila aceitou o pedido mas perdeu a resposta', async () => {
    prisma.printExport.create.mockResolvedValue(queuedRecord);
    imageInputs.stage.mockResolvedValue(['input-1']);
    queue.add.mockImplementation(async () => {
      queue.getJob.mockResolvedValue({ data: { inputIds: ['input-1'] } });
      throw new Error('timeout');
    });
    await expect(
      service.create('mat-1', 'org-1', 'user-1', dto),
    ).resolves.toMatchObject({ id: 'export-1' });
    expect(imageInputs.cleanup).not.toHaveBeenCalled();
  });

  it('remove apenas as imagens da tentativa que perdeu a concorrência', async () => {
    prisma.printExport.create.mockResolvedValue(queuedRecord);
    imageInputs.stage.mockResolvedValue(['loser']);
    queue.add.mockImplementation(async () => {
      queue.getJob.mockResolvedValue({ data: { inputIds: ['winner'] } });
    });
    await service.create('mat-1', 'org-1', 'user-1', dto);
    expect(imageInputs.cleanup).toHaveBeenCalledWith(['loser']);
    expect(imageInputs.cleanup).not.toHaveBeenCalledWith(['winner']);
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
    const remove = jest.fn().mockImplementation(async () => {
      queue.getJob.mockResolvedValue(null);
    });
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
