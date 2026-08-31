import { NotificationGateway } from '../gateway/notification.gateway';
import { NotificationRepository } from '../repository';
import { CreateInAppNotificationUseCase } from './create-in-app-notification.use-case';

describe('CreateInAppNotificationUseCase', () => {
  let notificationRepository: { create: jest.Mock };
  let notificationGateway: { emitCreated: jest.Mock };
  let useCase: CreateInAppNotificationUseCase;

  const payload = {
    organizationId: 'org-1',
    userId: 'user-1',
    type: 'MATERIAL_CREATED' as const,
    title: 'Novo material disponível',
    body: 'Peça · Categoria',
    href: '/material/m1',
    resourceType: 'material',
    resourceId: 'm1',
    dedupeKey: 'MATERIAL_CREATED:org-1:m1:user-1',
  };

  const created = {
    id: 'n1',
    type: 'MATERIAL_CREATED' as const,
    title: payload.title,
    body: payload.body,
    href: payload.href,
    resourceType: payload.resourceType,
    resourceId: payload.resourceId,
    readAt: null,
    createdAt: new Date('2026-08-30T00:00:00.000Z'),
  };

  beforeEach(() => {
    notificationRepository = { create: jest.fn() };
    notificationGateway = { emitCreated: jest.fn() };
    useCase = new CreateInAppNotificationUseCase(
      notificationRepository as unknown as NotificationRepository,
      notificationGateway as unknown as NotificationGateway,
    );
  });

  it('deve persistir e emitir a notificação criada', async () => {
    notificationRepository.create.mockResolvedValue(created);

    await useCase.execute(payload);

    expect(notificationRepository.create).toHaveBeenCalledWith(payload);
    expect(notificationGateway.emitCreated).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      created,
    );
  });

  it('não deve emitir quando a notificação for duplicada', async () => {
    notificationRepository.create.mockResolvedValue(null);

    await useCase.execute(payload);

    expect(notificationGateway.emitCreated).not.toHaveBeenCalled();
  });
});
