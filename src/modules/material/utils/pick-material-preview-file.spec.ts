import { pickMaterialPreviewFile } from './pick-material-preview-file';

describe('pickMaterialPreviewFile', () => {
  it('deve retornar null quando não houver arquivos', () => {
    expect(pickMaterialPreviewFile([])).toBeNull();
  });

  it('deve retornar o único arquivo quando houver apenas um', () => {
    const file = { mimeType: 'application/pdf', imageKey: 'file.pdf' };

    expect(pickMaterialPreviewFile([file])).toBe(file);
  });

  it('deve priorizar arquivo de imagem quando houver múltiplos arquivos', () => {
    const pdf = { mimeType: 'application/pdf', imageKey: 'file.pdf' };
    const image = { mimeType: 'image/png', imageKey: 'file.png' };

    expect(pickMaterialPreviewFile([pdf, image])).toBe(image);
  });

  it('deve retornar o primeiro arquivo quando não houver imagem', () => {
    const pdf = { mimeType: 'application/pdf', imageKey: 'file.pdf' };
    const doc = { mimeType: 'application/msword', imageKey: 'file.doc' };

    expect(pickMaterialPreviewFile([pdf, doc])).toBe(pdf);
  });
});
