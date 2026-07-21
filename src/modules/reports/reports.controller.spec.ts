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

  it('deve delegar listagem de usuários por download de materiais', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    findTopUsersByMaterialDownloadsUseCase.execute.mockResolvedValue(
      paginated,
    );

    const result = await controller.findTopUsersByMaterialDownloads('org-1', {
      page: 1,
      limit: 10,
    });

    expect(result).toBe(paginated);
    expect(
      findTopUsersByMaterialDownloadsUseCase.execute,
    ).toHaveBeenCalledWith('org-1', { page: 1, limit: 10 });
  });

  it('deve delegar listagem de materiais mais visualizados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    findTopMaterialsByViewsUseCase.execute.mockResolvedValue(paginated);

    const result = await controller.findTopMaterialsByViews('org-1', {
      page: 1,
      limit: 10,
    });

    expect(result).toBe(paginated);
    expect(findTopMaterialsByViewsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      { page: 1, limit: 10 },
    );
  });

  it('deve delegar listagem de materiais mais baixados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    findTopMaterialsByDownloadsUseCase.execute.mockResolvedValue(paginated);

    const result = await controller.findTopMaterialsByDownloads('org-1', {
      page: 1,
      limit: 10,
    });

    expect(result).toBe(paginated);
    expect(findTopMaterialsByDownloadsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      { page: 1, limit: 10 },
    );
  });

  it('deve enfileirar exportação de usuários por login', async () => {
    enqueueReportExportUseCase.execute.mockResolvedValue({ enqueued: true });

    const result = await controller.exportTopUsersByPlatformLogins(
      'org-1',
      'user-1',
    );

    expect(enqueueReportExportUseCase.execute).toHaveBeenCalledWith(
      ReportType.USERS_TOP_LOGINS,
      'org-1',
      'user-1',
    );
    expect(result.message).toContain('Relatório enfileirado');
  });

  it('deve enfileirar exportação de usuários por download', async () => {
    enqueueReportExportUseCase.execute.mockResolvedValue({ enqueued: true });

    const result = await controller.exportTopUsersByMaterialDownloads(
      'org-1',
      'user-1',
    );

    expect(enqueueReportExportUseCase.execute).toHaveBeenCalledWith(
      ReportType.USERS_TOP_DOWNLOADS,
      'org-1',
      'user-1',
    );
    expect(result.message).toContain('Relatório enfileirado');
  });

  it('deve enfileirar exportação de materiais mais visualizados', async () => {
    enqueueReportExportUseCase.execute.mockResolvedValue({ enqueued: true });

    const result = await controller.exportTopMaterialsByViews(
      'org-1',
      'user-1',
    );

    expect(enqueueReportExportUseCase.execute).toHaveBeenCalledWith(
      ReportType.MATERIALS_TOP_VIEWS,
      'org-1',
      'user-1',
    );
    expect(result.message).toContain('Relatório enfileirado');
  });

  it('deve usar filtros vazios por padrão quando não informados', async () => {
    findTopUsersByPlatformLoginsUseCase.execute.mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });
    findTopUsersByMaterialDownloadsUseCase.execute.mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });
    findTopMaterialsByViewsUseCase.execute.mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });
    findTopMaterialsByDownloadsUseCase.execute.mockResolvedValue({
      data: [],
      total: 0,
      totalPages: 0,
      page: 1,
    });

    await controller.findTopUsersByPlatformLogins('org-1');
    await controller.findTopUsersByMaterialDownloads('org-1');
    await controller.findTopMaterialsByViews('org-1');
    await controller.findTopMaterialsByDownloads('org-1');

    expect(findTopUsersByPlatformLoginsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      {},
    );
    expect(
      findTopUsersByMaterialDownloadsUseCase.execute,
    ).toHaveBeenCalledWith('org-1', {});
    expect(findTopMaterialsByViewsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      {},
    );
    expect(findTopMaterialsByDownloadsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      {},
    );
  });
});
