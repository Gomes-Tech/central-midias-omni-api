import { MATERIAL_NOTIFICATION_EMAIL_JOB } from '@infrastructure/queue';
import { Job } from 'bullmq';
import { MaterialNotificationEmailProcessor } from '../queue/material-notification-email.processor';
import { SendMaterialNotificationEmailUseCase } from '../use-cases/send-material-notification-email.use-case';

describe('MaterialNotificationEmailProcessor', () => {
  let sendMaterialNotificationEmailUseCase: { execute: jest.Mock };
  let processor: MaterialNotificationEmailProcessor;

  beforeEach(() => {
    sendMaterialNotificationEmailUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    processor = new MaterialNotificationEmailProcessor(
      sendMaterialNotificationEmailUseCase as unknown as SendMaterialNotificationEmailUseCase,
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
      name: MATERIAL_NOTIFICATION_EMAIL_JOB,
      data: payload,
    } as Job);

    expect(sendMaterialNotificationEmailUseCase.execute).toHaveBeenCalledWith(
      payload,
    );
  });

  it('deve propagar erro para BullMQ retry', async () => {
    const error = new Error('smtp');
    sendMaterialNotificationEmailUseCase.execute.mockRejectedValue(error);

    await expect(
      processor.process({
        name: MATERIAL_NOTIFICATION_EMAIL_JOB,
        data: {},
      } as Job),
    ).rejects.toBe(error);
  });

  it('deve ignorar jobs com nome desconhecido', async () => {
    await processor.process({
      name: 'other-job',
      data: {},
    } as Job);

    expect(sendMaterialNotificationEmailUseCase.execute).not.toHaveBeenCalled();
  });
});
