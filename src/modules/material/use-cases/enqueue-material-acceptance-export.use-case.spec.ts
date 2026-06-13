import { BadRequestException, NotFoundException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { MATERIAL_ACCEPTANCE_EXPORT_JOB } from '@infrastructure/queue';
import { FindUserByIdUseCase } from '@modules/user';
import { MaterialRepository } from '../repository';
import { EnqueueMaterialAcceptanceExportUseCase } from './enqueue-material-acceptance-export.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('EnqueueMaterialAcceptanceExportUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let findUserByIdUseCase: { execute: jest.Mock };
  let materialAcceptanceExportQueue: { add: jest.Mock };
  let logger: { info: jest.Mock };
  let useCase: EnqueueMaterialAcceptanceExportUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    findUserByIdUseCase = {
      execute: jest.fn().mockResolvedValue({
        id: 'user-id',
        name: 'João',
        email: 'joao@teste.com',
      }),
    };

    materialAcceptanceExportQueue = {
      add: jest.fn().mockResolvedValue(undefined),
    };

    logger = { info: jest.fn() };

    useCase = new EnqueueMaterialAcceptanceExportUseCase(
      materialRepository,
      findUserByIdUseCase as unknown as FindUserByIdUseCase,
      materialAcceptanceExportQueue as never,
      logger as unknown as LoggerService,
    );
  });

  it('deve enfileirar exportação quando material exigir aceite', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: true });
    materialRepository.findById.mockResolvedValue(material);

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id'),
    ).resolves.toEqual({ enqueued: true });

    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith('user-id');
    expect(materialAcceptanceExportQueue.add).toHaveBeenCalledWith(
      MATERIAL_ACCEPTANCE_EXPORT_JOB,
      {
        materialId: material.id,
        organizationId: 'org-id',
        userId: 'user-id',
        email: 'joao@teste.com',
        name: 'João',
      },
      { jobId: `${material.id}:user-id:export` },
    );
  });

  it('deve rejeitar exportação quando material não exigir aceite', async () => {
    materialRepository.findById.mockResolvedValue(makeMaterialDetails());

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).rejects.toThrow(BadRequestException);

    expect(materialAcceptanceExportQueue.add).not.toHaveBeenCalled();
  });

  it('deve lançar NotFoundException quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', 'org-id', 'user-id'),
    ).rejects.toThrow(NotFoundException);

    expect(materialAcceptanceExportQueue.add).not.toHaveBeenCalled();
  });
});
