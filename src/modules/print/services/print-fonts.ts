import { join } from 'node:path';

export const PRINT_FONT_FILES = {
  'Averta CY': 'AvertaCY-Regular.otf',
  'Averta CY Semibold': 'AvertaCY-Semibold.otf',
  'Averta CY Bold': 'AvertaCY-Bold.otf',
} as const;

export type PrintFontFamily = keyof typeof PRINT_FONT_FILES;

export function isPrintFontFamily(value: string): value is PrintFontFamily {
  return value in PRINT_FONT_FILES;
}

export function resolvePrintFontFamily(fontFamily: string, bold: boolean) {
  if (bold) return 'Averta CY Bold' as const;
  return isPrintFontFamily(fontFamily) ? fontFamily : ('Averta CY' as const);
}

export function getPrintFontPath(fontFamily: PrintFontFamily) {
  return join(
    __dirname,
    '..',
    'resources',
    'fonts',
    PRINT_FONT_FILES[fontFamily],
  );
}
