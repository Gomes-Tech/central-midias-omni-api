import { LoggerService } from '@infrastructure/log';
import {
  MATERIAL_ACCEPTANCE_EMAIL_JOB,
} from '@infrastructure/queue';
import { MaterialRepository } from '../repository';
import { EnqueueMaterialAcceptanceEmailsUseCase } from './enqueue-material-acceptance-emails.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('EnqueueMaterialAcceptanceEmailsUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let materialAcceptanceEmailQueue: { add: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: EnqueueMaterialAcceptanceEmailsUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
      findEligibleMembersForCategory: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    materialAcceptanceEmailQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    logger = { info: jest.fn() };

    useCase = new EnqueueMaterialAcceptanceEmailsUseCase(
      materialRepository,
      materialAcceptanceEmailQueue as never,
      logger as unknown as LoggerService,
    );
  });

  it('deve enfileirar um job por membro elegível', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: true });
    const previousFrontendUrl = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://app.exemplo.com/';

    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findEligibleMembersForCategory.mockResolvedValue([
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

    expect(materialAcceptanceEmailQueue.add).toHaveBeenCalledTimes(2);
    expect(materialAcceptanceEmailQueue.add).toHaveBeenCalledWith(
      MATERIAL_ACCEPTANCE_EMAIL_JOB,
      expect.objectContaining({
        materialId: material.id,
        organizationId: 'org-id',
        userId: 'user-1',
        email: 'joao@teste.com',
        materialLink: `https://app.exemplo.com/materials/${material.id}`,
      }),
      { jobId: `${material.id}:user-1` },
    );

    process.env.FRONTEND_URL = previousFrontendUrl;
  });

  it('não deve enfileirar quando material não exigir aceite', async () => {
    materialRepository.findById.mockResolvedValue(makeMaterialDetails());

    await expect(
      useCase.execute('material-id', 'org-id'),
    ).resolves.toEqual({ enqueued: 0 });

    expect(materialAcceptanceEmailQueue.add).not.toHaveBeenCalled();
  });

  it('não deve enfileirar quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('material-id', 'org-id'),
    ).resolves.toEqual({ enqueued: 0 });

    expect(materialAcceptanceEmailQueue.add).not.toHaveBeenCalled();
  });

  it('não deve enfileirar quando não houver membros elegíveis', async () => {
    materialRepository.findById.mockResolvedValue(
      makeMaterialDetails({ requiresAcceptance: true }),
    );
    materialRepository.findEligibleMembersForCategory.mockResolvedValue([]);

    await expect(
      useCase.execute('material-id', 'org-id'),
    ).resolves.toEqual({ enqueued: 0 });

    expect(materialAcceptanceEmailQueue.add).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'Nenhum membro elegível para notificação de material',
      expect.objectContaining({
        materialId: 'material-id',
        organizationId: 'org-id',
      }),
    );
  });

  it('deve enfileirar sem materialLink quando FRONTEND_URL não estiver definido', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: true });
    const previousFrontendUrl = process.env.FRONTEND_URL;
    delete process.env.FRONTEND_URL;

    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findEligibleMembersForCategory.mockResolvedValue([
      {
        userId: 'user-1',
        name: 'João',
        email: 'joao@teste.com',
      },
    ]);

    await expect(
      useCase.execute(material.id, 'org-id'),
    ).resolves.toEqual({ enqueued: 1 });

    expect(materialAcceptanceEmailQueue.add).toHaveBeenCalledWith(
      MATERIAL_ACCEPTANCE_EMAIL_JOB,
      expect.objectContaining({
        materialLink: undefined,
      }),
      expect.any(Object),
    );

    process.env.FRONTEND_URL = previousFrontendUrl;
  });
});
