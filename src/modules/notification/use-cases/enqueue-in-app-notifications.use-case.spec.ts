import { LoggerService } from '@infrastructure/log';
import { MaterialRepository } from '@modules/material/repository';
import { makeMaterialDetails } from '@modules/material/use-cases/test-helpers';
import { CreateInAppNotificationUseCase } from './create-in-app-notification.use-case';
import { EnqueueInAppNotificationsUseCase } from './enqueue-in-app-notifications.use-case';

describe('EnqueueInAppNotificationsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let createInAppNotificationUseCase: { execute: jest.Mock };
  let logger: { info: jest.Mock; error: jest.Mock };
  let useCase: EnqueueInAppNotificationsUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
      findEligibleMembersForCategory: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;
    createInAppNotificationUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    logger = { info: jest.fn(), error: jest.fn() };
    useCase = new EnqueueInAppNotificationsUseCase(
      materialRepository,
      createInAppNotificationUseCase as unknown as CreateInAppNotificationUseCase,
      logger as unknown as LoggerService,
    );
  });

  it('deve criar uma notificação por membro com acesso à categoria, incluindo backoffice', async () => {
    const material = makeMaterialDetails();
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findEligibleMembersForCategory.mockResolvedValue([
      { userId: 'user-1', name: 'João', email: 'joao@teste.com' },
      { userId: 'admin-1', name: 'Ana', email: 'ana@teste.com' },
    ]);

    await expect(
      useCase.execute({
        materialId: material.id,
        organizationId: 'org-id',
        type: 'MATERIAL_CREATED',
        actorUserId: 'admin-id',
      }),
    ).resolves.toEqual({ enqueued: 2 });

    expect(materialRepository.findEligibleMembersForCategory).toHaveBeenCalledWith(
      'org-id',
      material.categoryId,
    );
    expect(createInAppNotificationUseCase.execute).toHaveBeenCalledTimes(2);
    expect(createInAppNotificationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        type: 'MATERIAL_CREATED',
        title: 'Novo material disponível',
        body: `${material.name} · ${material.category.name}`,
        href: `/material/${material.id}`,
        resourceType: 'material',
        resourceId: material.id,
        dedupeKey: `MATERIAL_CREATED:org-id:${material.id}:user-1`,
      }),
    );
  });

  it('não deve criar quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        materialId: 'missing',
        organizationId: 'org-id',
        type: 'MATERIAL_CREATED',
      }),
    ).resolves.toEqual({ enqueued: 0 });

    expect(createInAppNotificationUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve continuar criando para os demais membros se um insert falhar', async () => {
    const material = makeMaterialDetails();
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findEligibleMembersForCategory.mockResolvedValue([
      { userId: 'user-1', name: 'João', email: 'joao@teste.com' },
      { userId: 'user-2', name: 'Ana', email: 'ana@teste.com' },
    ]);
    createInAppNotificationUseCase.execute
      .mockRejectedValueOnce(new Error('db'))
      .mockResolvedValueOnce(undefined);

    await expect(
      useCase.execute({
        materialId: material.id,
        organizationId: 'org-id',
        type: 'MATERIAL_CREATED',
      }),
    ).resolves.toEqual({ enqueued: 1 });

    expect(createInAppNotificationUseCase.execute).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalled();
  });
});
