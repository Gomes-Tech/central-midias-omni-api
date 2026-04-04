import 'reflect-metadata';

jest.mock('@common/utils', () => {
  const actual = jest.requireActual('@common/utils') as Record<string, unknown>;
  return {
    ...actual,
    sanitizeInput: (
      input: string | undefined | null,
      allowRichText = false,
    ): string => {
      if (!input || typeof input !== 'string') {
        return '';
      }
      const out = input.replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        '',
      );
      if (allowRichText) {
        return out.trim();
      }
      return out.replace(/<[^>]+>/g, '').trim();
    },
  };
});

import { Expose, plainToInstance } from 'class-transformer';
import { Sanitize } from './sanitize.decorator';

class DtoPlain {
  @Expose()
  @Sanitize()
  name!: string;

  @Expose()
  @Sanitize(true)
  description!: string;
}

describe('sanitize.decorator', () => {
  it('deve remover tags HTML quando allowRichText for false', () => {
    const dto = plainToInstance(
      DtoPlain,
      {
        name: '<script>alert(1)</script>ok',
        description: 'x',
      },
      { excludeExtraneousValues: true },
    );

    expect(dto.name).toBe('ok');
    expect(dto.description).toBe('x');
  });

  it('deve preservar null e undefined', () => {
    const dto = plainToInstance(
      DtoPlain,
      {
        name: null,
        description: undefined,
      },
      { excludeExtraneousValues: true },
    );

    expect(dto.name).toBeNull();
    expect(dto.description).toBeUndefined();
  });

  it('deve sanitizar cada string de um array', () => {
    class Tags {
      @Expose()
      @Sanitize()
      items!: string[];
    }

    const dto = plainToInstance(
      Tags,
      {
        items: ['<b>a</b>', 'plain'],
      },
      { excludeExtraneousValues: true },
    );

    expect(dto.items[0]).toBe('a');
    expect(dto.items[1]).toBe('plain');
  });

  it('deve repassar itens não string em array sem sanitizar', () => {
    class Mixed {
      @Expose()
      @Sanitize()
      items!: (string | number)[];
    }

    const dto = plainToInstance(
      Mixed,
      { items: ['<b>x</b>', 42] },
      { excludeExtraneousValues: true },
    );

    expect(dto.items[0]).toBe('x');
    expect(dto.items[1]).toBe(42);
  });

  it('deve repassar valores não string sem alteração', () => {
    class Num {
      @Expose()
      @Sanitize()
      n!: number;
    }

    const dto = plainToInstance(
      Num,
      { n: 42 },
      {
        excludeExtraneousValues: true,
      },
    );

    expect(dto.n).toBe(42);
  });

  it('com allowRichText deve remover script e manter outras tags', () => {
    class D {
      @Expose()
      @Sanitize(true)
      html!: string;
    }

    const dto = plainToInstance(
      D,
      { html: '<p>ok</p><script>x</script>' },
      { excludeExtraneousValues: true },
    );

    expect(dto.html).toBe('<p>ok</p>');
  });
});
