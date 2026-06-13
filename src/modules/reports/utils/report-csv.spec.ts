import {
  buildReportExportFilename,
  buildTopMaterialsByDownloadsCsv,
  buildTopMaterialsByViewsCsv,
  buildTopUsersByMaterialDownloadsCsv,
  buildTopUsersByPlatformLoginsCsv,
} from './report-csv';

describe('report-csv', () => {
  it('deve montar CSV de usuários por login', () => {
    const csv = buildTopUsersByPlatformLoginsCsv([
      {
        userId: 'user-1',
        name: 'Ana, Silva',
        email: 'ana@test.com',
        loginCount: 3,
        lastLoginAt: new Date('2026-06-01T10:00:00.000Z'),
      },
    ]);

    expect(csv).toContain('nome,email,total_logins,ultimo_login');
    expect(csv).toContain('"Ana, Silva"');
    expect(csv).toContain('3');
  });

  it('deve montar CSV de usuários por download', () => {
    const csv = buildTopUsersByMaterialDownloadsCsv([
      {
        userId: 'user-1',
        name: 'Bruno',
        email: 'bruno@test.com',
        downloadCount: 5,
      },
    ]);

    expect(csv).toBe('nome,email,total_downloads\nBruno,bruno@test.com,5');
  });

  it('deve montar CSV de materiais por visualização', () => {
    const csv = buildTopMaterialsByViewsCsv([
      {
        materialId: 'mat-1',
        name: 'Guia',
        categoryName: 'Comunicação',
        viewCount: 10,
      },
    ]);

    expect(csv).toBe(
      'material,categoria,total_visualizacoes\nGuia,Comunicação,10',
    );
  });

  it('deve montar CSV de materiais por download', () => {
    const csv = buildTopMaterialsByDownloadsCsv([
      {
        materialId: 'mat-1',
        name: 'Manual',
        categoryName: 'Treinamento',
        downloadCount: 7,
      },
    ]);

    expect(csv).toBe(
      'material,categoria,total_downloads\nManual,Treinamento,7',
    );
  });

  it('deve montar filename padronizado', () => {
    expect(buildReportExportFilename('usuarios-logins')).toBe(
      'relatorio-usuarios-logins.csv',
    );
  });
});
