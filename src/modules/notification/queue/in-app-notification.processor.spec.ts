import { IN_APP_NOTIFICATION_JOB } from '@infrastructure/queue';
import { Job } from 'bullmq';
import { CreateInAppNotificationUseCase } from '../use-cases/create-in-app-notification.use-case';
import { InAppNotificationProcessor } from './in-app-notification.processor';

describe('InAppNotificationProcessor', () => {
  let createInAppNotificationUseCase: { execute: jest.Mock };
  let processor: InAppNotificationProcessor;

  beforeEach(() => {
    createInAppNotificationUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    processor = new InAppNotificationProcessor(
      createInAppNotificationUseCase as unknown as CreateInAppNotificationUseCase,
    );
  });

  it('deve persistir a notificação do job', async () => {
    const payload = {
      organizationId: 'org-id',
      userId: 'user-id',
      type: 'MATERIAL_CREATED' as const,
      title: 'Novo material disponível',
      body: 'Peça · Categoria',
      href: '/material/m1',
      resourceType: 'material',
      resourceId: 'm1',
      dedupeKey: 'MATERIAL_CREATED:org-id:m1:user-id',
    };

    await processor.process({
      name: IN_APP_NOTIFICATION_JOB,
      data: payload,
    } as Job);

    expect(createInAppNotificationUseCase.execute).toHaveBeenCalledWith(
      payload,
    );
  });

  it('deve ignorar jobs com nome desconhecido', async () => {
    await processor.process({
      name: 'other-job',
      data: {},
    } as Job);

    expect(createInAppNotificationUseCase.execute).not.toHaveBeenCalled();
  });
});
