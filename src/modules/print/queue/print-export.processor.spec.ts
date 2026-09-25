import { PrintExportProcessor } from './print-export.processor';
import { PRINT_EXPORT_JOB } from '@infrastructure/queue';
import { PRINT_EXPORT_CLEANUP_JOB } from './print-export.job';
import { placeholderDocument } from '../../../test-utils/print-image-fixtures';

describe('PrintExportProcessor image lifecycle', () => {
  let prisma: any;
  let renderer: any;
  let inputs: any;
  let exports: any;
  let processor: PrintExportProcessor;
  let job: any;

  beforeEach(() => {
    prisma = {
      printExport: {
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    renderer = {
      render: jest
        .fn()
        .mockResolvedValue({ fileKey: 'pdf', checksum: 'hash', size: 100 }),
    };
    inputs = {
      cleanup: jest.fn().mockResolvedValue(undefined),
      expireInputs: jest.fn().mockResolvedValue(1),
    };
    exports = { expireCompletedFiles: jest.fn().mockResolvedValue(1) };
    processor = new PrintExportProcessor(
      prisma,
      renderer,
      exports,
      { info: jest.fn(), error: jest.fn() } as never,
      {} as never,
      inputs,
    );
    job = {
      name: PRINT_EXPORT_JOB,
      data: {
        exportId: 'export',
        document: placeholderDocument,
        inputIds: ['input'],
      },
      attemptsMade: 0,
      opts: { attempts: 2 },
      updateProgress: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('limpa as fotos após persistir o PDF concluído', async () => {
    await processor.process(job);
    expect(renderer.render).toHaveBeenCalledWith(
      'export',
      placeholderDocument,
      expect.any(Function),
      ['input'],
    );
    expect(prisma.printExport.update).toHaveBeenLastCalledWith({
      where: { id: 'export' },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    });
    expect(inputs.cleanup).toHaveBeenCalledWith(['input']);
    expect(inputs.cleanup.mock.invocationCallOrder[0]).toBeGreaterThan(
      prisma.printExport.update.mock.invocationCallOrder[1],
    );
  });

  it('preserva fotos no retry automático e limpa na falha definitiva', async () => {
    renderer.render.mockRejectedValue(new Error('render'));
    await expect(processor.process(job)).rejects.toThrow('render');
    expect(inputs.cleanup).not.toHaveBeenCalled();
    expect(prisma.printExport.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'export' },
      data: expect.objectContaining({ status: 'QUEUED' }),
    });
    job.attemptsMade = 1;
    await expect(processor.process(job)).rejects.toThrow('render');
    expect(inputs.cleanup).toHaveBeenCalledWith(['input']);
    expect(prisma.printExport.updateMany).toHaveBeenLastCalledWith({
      where: { id: 'export' },
      data: expect.objectContaining({ status: 'FAILED' }),
    });
  });

  it('limpa arquivos mesmo se a exportação foi excluída', async () => {
    prisma.printExport.update.mockRejectedValue(new Error('deleted'));
    job.attemptsMade = 1;
    await expect(processor.process(job)).rejects.toThrow('deleted');
    expect(inputs.cleanup).toHaveBeenCalledWith(['input']);
  });

  it('executa a coleta de PDFs e imagens expiradas', async () => {
    await processor.process({ name: PRINT_EXPORT_CLEANUP_JOB } as never);
    expect(exports.expireCompletedFiles).toHaveBeenCalled();
    expect(inputs.expireInputs).toHaveBeenCalled();
  });
});
