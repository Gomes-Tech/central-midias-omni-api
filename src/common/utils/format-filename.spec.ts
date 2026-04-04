import { renameFile } from './format-filename';

describe('renameFile', () => {
  it('deve normalizar acentos e caracteres especiais preservando extensão', () => {
    expect(renameFile('Relatório Anual 2024.PDF')).toBe(
      'Relatorio-Anual-2024.pdf',
    );
  });

  it('deve tratar arquivo sem extensão', () => {
    expect(renameFile('Só_nome')).toBe('So-nome');
  });

  it('deve colapsar hífens múltiplos e remover das pontas', () => {
    expect(renameFile('  a--b__c  .png')).toBe('a-b-c.png');
  });

  it('deve mapear cedilha e til para ASCII no nome', () => {
    expect(renameFile('ação.JPEG')).toBe('acao.jpeg');
  });
});
