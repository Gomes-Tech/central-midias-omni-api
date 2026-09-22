import { normalizeMaterialFileName } from './normalize-material-file-name';

describe('normalizeMaterialFileName', () => {
  it('normaliza caminho, espaços e caracteres de controle', () => {
    expect(
      normalizeMaterialFileName('  C:\\temporario\\campanha\u0000.pdf  '),
    ).toBe('campanha.pdf');
  });

  it('corrige nome UTF-8 recebido como latin1 pelo multipart', () => {
    const mojibake = Buffer.from('Ação de verão.png', 'utf8').toString(
      'latin1',
    );

    expect(normalizeMaterialFileName(mojibake)).toBe('Ação de verão.png');
  });

  it('usa nome neutro quando o nome estiver vazio', () => {
    expect(normalizeMaterialFileName('   ')).toBe('arquivo');
  });
});
