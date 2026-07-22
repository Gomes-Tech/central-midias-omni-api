import { ReportType } from '../entities';
import { ExportReportUseCase } from './export-report.use-case';

describe('ExportReportUseCase', () => {
  let reportRepository: {
    findAllTopUsersByPlatformLogins: jest.Mock;
    findAllTopUsersByMaterialDownloads: jest.Mock;
    findAllTopMaterialsByViews: jest.Mock;
    findAllTopMaterialsByDownloads: jest.Mock;
    findAllTopSearches: jest.Mock;
  };
  let useCase: ExportReportUseCase;

  beforeEach(() => {
    reportRepository = {
      findAllTopUsersByPlatformLogins: jest.fn().mockResolvedValue([
        {
          userId: 'user-1',
          name: 'Ana',
          email: 'ana@test.com',
          loginCount: 2,
          lastLoginAt: null,
        },
      ]),
      findAllTopUsersByMaterialDownloads: jest.fn().mockResolvedValue([]),
      findAllTopMaterialsByViews: jest.fn().mockResolvedValue([]),
      findAllTopMaterialsByDownloads: jest.fn().mockResolvedValue([]),
      findAllTopSearches: jest.fn().mockResolvedValue([]),
    };

    useCase = new ExportReportUseCase(reportRepository as never);
  });

  it('deve exportar CSV de usuários por login', async () => {
    const result = await useCase.execute(
      ReportType.USERS_TOP_LOGINS,
      'org-1',
    );

    expect(result.filename).toBe('relatorio-usuarios-logins.csv');
    expect(result.content).toContain('Ana');
    expect(reportRepository.findAllTopUsersByPlatformLogins).toHaveBeenCalledWith(
      'org-1',
    );
  });

  it('deve exportar CSV de usuários por download de materiais', async () => {
    reportRepository.findAllTopUsersByMaterialDownloads.mockResolvedValue([
      {
        userId: 'user-1',
        name: 'Bruno',
        email: 'bruno@test.com',
        downloadCount: 5,
      },
    ]);

    const result = await useCase.execute(
      ReportType.USERS_TOP_DOWNLOADS,
      'org-1',
    );

    expect(result.filename).toBe('relatorio-usuarios-downloads.csv');
    expect(result.content).toContain('Bruno');
    expect(
      reportRepository.findAllTopUsersByMaterialDownloads,
    ).toHaveBeenCalledWith('org-1');
  });

  it('deve exportar CSV de materiais mais visualizados', async () => {
    reportRepository.findAllTopMaterialsByViews.mockResolvedValue([
      {
        materialId: 'mat-1',
        name: 'Banner',
        categoryName: 'Institucional',
        viewCount: 12,
      },
    ]);

    const result = await useCase.execute(
      ReportType.MATERIALS_TOP_VIEWS,
      'org-1',
    );

    expect(result.filename).toBe('relatorio-materiais-visualizacoes.csv');
    expect(result.content).toContain('Banner');
    expect(reportRepository.findAllTopMaterialsByViews).toHaveBeenCalledWith(
      'org-1',
    );
  });

  it('deve exportar CSV de materiais mais baixados', async () => {
    reportRepository.findAllTopMaterialsByDownloads.mockResolvedValue([
      {
        materialId: 'mat-2',
        name: 'Manual',
        categoryName: 'Treinamento',
        downloadCount: 7,
      },
    ]);

    const result = await useCase.execute(
      ReportType.MATERIALS_TOP_DOWNLOADS,
      'org-1',
    );

    expect(result.filename).toBe('relatorio-materiais-downloads.csv');
    expect(result.content).toContain('Manual');
    expect(
      reportRepository.findAllTopMaterialsByDownloads,
    ).toHaveBeenCalledWith('org-1');
  });

  it('deve exportar CSV de buscas agregadas', async () => {
    reportRepository.findAllTopSearches.mockResolvedValue([
      {
        term: 'bola',
        search: 'bola',
        tag: 'bola',
        quantity: 51,
      },
    ]);

    const result = await useCase.execute(ReportType.SEARCHES_TOP, 'org-1');

    expect(result.filename).toBe('relatorio-buscas.csv');
    expect(result.content).toBe(
      'term,search,tag,quantity\nbola,bola,bola,51',
    );
    expect(reportRepository.findAllTopSearches).toHaveBeenCalledWith('org-1');
  });

  it('deve lançar BadRequestException para tipo de relatório inválido', async () => {
    await expect(
      useCase.execute('tipo-invalido' as ReportType, 'org-1'),
    ).rejects.toThrow('Tipo de relatório inválido');
  });
});
