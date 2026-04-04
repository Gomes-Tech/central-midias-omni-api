import { sanitizeInput, sanitizeObject } from './sanitize';

describe('sanitize', () => {
  describe('sanitizeInput', () => {
    it('retorna string vazia para null, undefined ou não-string', () => {
      expect(sanitizeInput(null)).toBe('');
      expect(sanitizeInput(undefined)).toBe('');
      expect(sanitizeInput(42 as never)).toBe('');
    });

    it('aplica trim na saída', () => {
      expect(sanitizeInput('  texto  ')).toBe('texto');
    });

    it('usa opções rich text quando allowRichText for true', () => {
      const plain = sanitizeInput('x');
      const rich = sanitizeInput('x', true);
      expect(plain).toBe('x');
      expect(rich).toBe('x');
    });
  });

  describe('sanitizeObject', () => {
    it('retorna o valor quando não for objeto', () => {
      expect(sanitizeObject(null as never)).toBeNull();
      expect(sanitizeObject('x' as never)).toBe('x');
    });

    it('percorre strings e objetos aninhados', () => {
      const input = {
        title: '  t  ',
        nested: { desc: '  y  ' },
      };
      const out = sanitizeObject(input);
      expect(out.title).toBe('t');
      expect(out.nested.desc).toBe('y');
    });

    it('percorre arrays de strings, números e objetos', () => {
      const input = {
        tags: ['  a  ', { inner: '  b  ' }],
        plain: [1, '  x  '],
      };
      const out = sanitizeObject(input);
      expect(out.tags[0]).toBe('a');
      expect((out.tags[1] as { inner: string }).inner).toBe('b');
      expect(out.plain).toEqual([1, 'x']);
    });

    it('propaga allowRichText para itens aninhados', () => {
      const out = sanitizeObject({ html: '  z  ' }, true);
      expect(out.html).toBe('z');
    });
  });
});
