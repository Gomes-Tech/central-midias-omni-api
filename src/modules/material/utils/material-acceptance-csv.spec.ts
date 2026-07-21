import {
  buildMaterialAcceptanceCsv,
  buildMaterialAcceptanceExportFilename,
} from './material-acceptance-csv';

describe('material-acceptance-csv', () => {
  it('deve escapar valores com aspas, vírgula ou quebra de linha', () => {
    const csv = buildMaterialAcceptanceCsv([
      {
        name: 'João "Silva"',
        email: 'joao,silva@teste.com',
        viewed: true,
        acceptedAt: new Date('2024-02-01T10:00:00.000Z'),
      },
      {
        name: 'Maria\nSouza',
        email: 'maria@teste.com',
        viewed: false,
        acceptedAt: null,
      },
    ]);

    expect(csv).toContain('"João ""Silva"""');
    expect(csv).toContain('"joao,silva@teste.com"');
    expect(csv).toContain('"Maria\nSouza"');
  });

  it('deve gerar nome de arquivo a partir do material', () => {
    expect(buildMaterialAcceptanceExportFilename('Manual Interno')).toBe(
      'material-aceite-manual-interno.csv',
    );
  });
});
