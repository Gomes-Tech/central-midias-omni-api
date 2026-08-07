import { normalizeSearchTerm } from './normalize-search-term';

describe('normalizeSearchTerm', () => {
  it('deve remover espaços externos, reduzir espaços internos e normalizar caixa', () => {
    expect(normalizeSearchTerm('  Campanha   DE   Verão  ')).toBe(
      'campanha de verão',
    );
  });

  it('deve preservar acentos', () => {
    expect(normalizeSearchTerm('AÇÃO')).toBe('ação');
  });
});
