import { secureCompare } from './crypto.util';

describe('secureCompare', () => {
  it('retorna false quando alguma string for vazia', () => {
    expect(secureCompare('', 'a')).toBe(false);
    expect(secureCompare('a', '')).toBe(false);
  });

  it('retorna false quando tamanhos diferirem', () => {
    expect(secureCompare('abc', 'ab')).toBe(false);
  });

  it('retorna true para strings idênticas', () => {
    expect(secureCompare('same', 'same')).toBe(true);
  });

  it('retorna false para mesmo tamanho com conteúdo diferente', () => {
    expect(secureCompare('aaaa', 'aaab')).toBe(false);
  });

  it('retorna false quando buffers UTF-8 tiverem tamanhos diferentes', () => {
    const a = '\uD834\uDD1E';
    const b = 'xy';

    expect(a.length).toBe(b.length);
    expect(secureCompare(a, b)).toBe(false);
  });
});
