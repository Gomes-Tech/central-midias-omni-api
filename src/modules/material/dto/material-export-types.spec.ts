import {
  normalizeMaterialExportTypes,
  normalizePrintPresetId,
  resolveTemplateExportConfig,
  toDigitalMimeTypes,
} from './material-export-types';

describe('material-export-types', () => {
  it('normaliza lista vazia e valores repetidos', () => {
    expect(normalizeMaterialExportTypes(undefined)).toBeUndefined();
    expect(normalizeMaterialExportTypes('')).toEqual([]);
    expect(normalizeMaterialExportTypes(['png', 'png', 'jpg', 'gif'])).toEqual([
      'png',
      'jpg',
    ]);
  });

  it('converte printPresetId vazio em null', () => {
    expect(normalizePrintPresetId(undefined)).toBeUndefined();
    expect(normalizePrintPresetId('')).toBeNull();
    expect(normalizePrintPresetId('  preset-id  ')).toBe('preset-id');
  });

  it('usa o mime da imagem base quando nenhum tipo é selecionado', () => {
    expect(toDigitalMimeTypes([], 'image/jpeg')).toEqual(['image/jpeg']);
    expect(
      resolveTemplateExportConfig({
        exportTypes: [],
        baseMimeType: 'image/png',
      }),
    ).toEqual({
      allowedExportTypes: [],
      digitalExportMimeType: 'image/png',
      printPresetId: null,
    });
  });

  it('deriva mime digital e limpa preset quando print_pdf não está marcado', () => {
    expect(
      resolveTemplateExportConfig({
        exportTypes: ['png', 'jpg', 'pdf'],
        printPresetId: 'preset-id',
        baseMimeType: 'image/jpeg',
      }),
    ).toEqual({
      allowedExportTypes: ['png', 'jpg', 'pdf'],
      digitalExportMimeType: 'image/png',
      printPresetId: null,
    });
    expect(toDigitalMimeTypes(['pdf', 'print_pdf'], 'image/png')).toEqual([]);
  });
});
