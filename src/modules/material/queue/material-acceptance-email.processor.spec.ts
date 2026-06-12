import { MATERIAL_ACCEPTANCE_EMAIL_JOB } from '@infrastructure/queue';
import { Job } from 'bullmq';
import { MaterialAcceptanceEmailProcessor } from '../queue/material-acceptance-email.processor';
import { SendMaterialAcceptanceEmailUseCase } from '../use-cases/send-material-acceptance-email.use-case';

describe('MaterialAcceptanceEmailProcessor', () => {
  let sendMaterialAcceptanceEmailUseCase: { execute: jest.Mock };
  let processor: MaterialAcceptanceEmailProcessor;

  beforeEach(() => {
    sendMaterialAcceptanceEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    processor = new MaterialAcceptanceEmailProcessor(
      sendMaterialAcceptanceEmailUseCase as unknown as SendMaterialAcceptanceEmailUseCase,
    );
  });

  it('deve delegar envio para o use case', async () => {
    const payload = {
      materialId: 'material-id',
      organizationId: 'org-id',
      userId: 'user-id',
      email: 'joao@teste.com',
      name: 'João',
      materialName: 'Manual',
    };

    await processor.process({
      name: MATERIAL_ACCEPTANCE_EMAIL_JOB,
      data: payload,
    } as Job);

    expect(sendMaterialAcceptanceEmailUseCase.execute).toHaveBeenCalledWith(
      payload,
    );
  });

  it('deve propagar erro para BullMQ retry', async () => {
    const error = new Error('smtp');
    sendMaterialAcceptanceEmailUseCase.execute.mockRejectedValue(error);

    await expect(
      processor.process({
        name: MATERIAL_ACCEPTANCE_EMAIL_JOB,
        data: {},
      } as Job),
    ).rejects.toBe(error);
  });

  it('deve ignorar jobs com nome desconhecido', async () => {
    await processor.process({
      name: 'other-job',
      data: {},
    } as Job);

    expect(sendMaterialAcceptanceEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
