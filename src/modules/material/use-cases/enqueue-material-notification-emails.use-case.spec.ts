import { LoggerService } from '@infrastructure/log';
import { MATERIAL_NOTIFICATION_EMAIL_JOB } from '@infrastructure/queue';
import { MaterialRepository } from '../repository';
import { EnqueueMaterialNotificationEmailsUseCase } from './enqueue-material-notification-emails.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('EnqueueMaterialNotificationEmailsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let materialNotificationEmailQueue: { add: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: EnqueueMaterialNotificationEmailsUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
      findPlatformMembersForCategory: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    materialNotificationEmailQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    logger = { info: jest.fn() };

    useCase = new EnqueueMaterialNotificationEmailsUseCase(
      materialRepository,
      materialNotificationEmailQueue as never,
      logger as unknown as LoggerService,
    );
  });

  it('deve enfileirar um job por membro da plataforma elegível', async () => {
    const material = makeMaterialDetails();
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findPlatformMembersForCategory.mockResolvedValue([
      {
        userId: 'user-1',
        name: 'João',
        email: 'joao@teste.com',
      },
      {
        userId: 'user-2',
        name: 'Maria',
        email: 'maria@teste.com',
      },
    ]);

    await expect(
      useCase.execute(material.id, 'org-id'),
    ).resolves.toEqual({ enqueued: 2 });

    expect(materialNotificationEmailQueue.add).toHaveBeenCalledTimes(2);
    expect(materialNotificationEmailQueue.add).toHaveBeenCalledWith(
      MATERIAL_NOTIFICATION_EMAIL_JOB,
      expect.objectContaining({
        materialId: material.id,
        organizationId: 'org-id',
        userId: 'user-1',
        email: 'joao@teste.com',
      }),
      { jobId: `${material.id}:user-1:notification` },
    );
  });

  it('não deve enfileirar quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('material-id', 'org-id'),
    ).resolves.toEqual({ enqueued: 0 });

    expect(materialNotificationEmailQueue.add).not.toHaveBeenCalled();
  });

  it('não deve enfileirar quando não houver membros elegíveis', async () => {
    materialRepository.findById.mockResolvedValue(makeMaterialDetails());
    materialRepository.findPlatformMembersForCategory.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id'),
    ).resolves.toEqual({ enqueued: 0 });

    expect(materialNotificationEmailQueue.add).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalled();
  });
});
