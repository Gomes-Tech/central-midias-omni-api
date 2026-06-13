import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportType } from './entities';
import { ReportsController } from './reports.controller';
import {
  EnqueueReportExportUseCase,
  FindTopMaterialsByDownloadsUseCase,
  FindTopMaterialsByViewsUseCase,
  FindTopUsersByMaterialDownloadsUseCase,
  FindTopUsersByPlatformLoginsUseCase,
} from './use-cases';

describe('ReportsController', () => {
  let controller: ReportsController;
  let findTopUsersByPlatformLoginsUseCase: { execute: jest.Mock };
  let findTopUsersByMaterialDownloadsUseCase: { execute: jest.Mock };
  let findTopMaterialsByViewsUseCase: { execute: jest.Mock };
  let findTopMaterialsByDownloadsUseCase: { execute: jest.Mock };
  let enqueueReportExportUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    findTopUsersByPlatformLoginsUseCase = { execute: jest.fn() };
    findTopUsersByMaterialDownloadsUseCase = { execute: jest.fn() };
    findTopMaterialsByViewsUseCase = { execute: jest.fn() };
    findTopMaterialsByDownloadsUseCase = { execute: jest.fn() };
    enqueueReportExportUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: FindTopUsersByPlatformLoginsUseCase,
          useValue: findTopUsersByPlatformLoginsUseCase,
        },
        {
          provide: FindTopUsersByMaterialDownloadsUseCase,
          useValue: findTopUsersByMaterialDownloadsUseCase,
        },
        {
          provide: FindTopMaterialsByViewsUseCase,
          useValue: findTopMaterialsByViewsUseCase,
        },
        {
          provide: FindTopMaterialsByDownloadsUseCase,
          useValue: findTopMaterialsByDownloadsUseCase,
        },
        {
          provide: EnqueueReportExportUseCase,
          useValue: enqueueReportExportUseCase,
        },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get(ReportsController);
  });

  it('deve delegar listagem de usuários por login', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    findTopUsersByPlatformLoginsUseCase.execute.mockResolvedValue(paginated);

    const result = await controller.findTopUsersByPlatformLogins('org-1', {
      page: 1,
      limit: 10,
    });

    expect(result).toBe(paginated);
    expect(findTopUsersByPlatformLoginsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      { page: 1, limit: 10 },
    );
  });

  it('deve enfileirar exportação de materiais por download', async () => {
    enqueueReportExportUseCase.execute.mockResolvedValue({ enqueued: true });

    const result = await controller.exportTopMaterialsByDownloads(
      'org-1',
      'user-1',
    );

    expect(enqueueReportExportUseCase.execute).toHaveBeenCalledWith(
      ReportType.MATERIALS_TOP_DOWNLOADS,
      'org-1',
      'user-1',
    );
    expect(result.message).toContain('Relatório enfileirado');
  });
});
