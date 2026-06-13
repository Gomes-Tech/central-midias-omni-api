import { MATERIAL_ACCEPTANCE_EXPORT_JOB } from '@infrastructure/queue';
import { Job } from 'bullmq';
import { MaterialAcceptanceExportProcessor } from '../queue/material-acceptance-export.processor';
import { SendMaterialAcceptanceExportEmailUseCase } from '../use-cases/send-material-acceptance-export-email.use-case';

describe('MaterialAcceptanceExportProcessor', () => {
  let sendMaterialAcceptanceExportEmailUseCase: { execute: jest.Mock };
  let processor: MaterialAcceptanceExportProcessor;

  beforeEach(() => {
    sendMaterialAcceptanceExportEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    processor = new MaterialAcceptanceExportProcessor(
      sendMaterialAcceptanceExportEmailUseCase as unknown as SendMaterialAcceptanceExportEmailUseCase,
    );
  });

  it('deve delegar envio para o use case', async () => {
    const payload = {
      materialId: 'material-id',
      organizationId: 'org-id',
      userId: 'user-id',
      email: 'joao@teste.com',
      name: 'João',
    };

    await processor.process({
      name: MATERIAL_ACCEPTANCE_EXPORT_JOB,
      data: payload,
    } as Job);

    expect(sendMaterialAcceptanceExportEmailUseCase.execute).toHaveBeenCalledWith(
      payload,
    );
  });

  it('deve propagar erro para BullMQ retry', async () => {
    const error = new Error('smtp');
    sendMaterialAcceptanceExportEmailUseCase.execute.mockRejectedValue(error);

    await expect(
      processor.process({
        name: MATERIAL_ACCEPTANCE_EXPORT_JOB,
        data: {},
      } as Job),
    ).rejects.toBe(error);
  });

  it('deve ignorar jobs com nome desconhecido', async () => {
    await processor.process({
      name: 'other-job',
      data: {},
    } as Job);

    expect(sendMaterialAcceptanceExportEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
