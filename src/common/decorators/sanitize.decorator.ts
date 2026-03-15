import { sanitizeInput } from '@common/utils';
import { Transform } from 'class-transformer';

/**
 * Decorator para sanitizar campos de entrada
 * Remove tags HTML e scripts maliciosos para prevenir XSS
 *
 * @param allowRichText - Se true, permite algumas tags HTML básicas (p, br, strong, etc)
 *                        Útil para campos como descrições que podem precisar de formatação
 *
 * @example
 * ```typescript
 * class CreateProductDTO {
 *   @Sanitize()
 *   name: string; // Remove todas as tags HTML
 *
 *   @Sanitize(true)
 *   description: string; // Permite tags básicas de formatação
 * }
 * ```
 */
export function Sanitize(allowRichText = false) {
  return Transform(({ value }) => {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return sanitizeInput(value, allowRichText);
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'string' ? sanitizeInput(item, allowRichText) : item,
      );
    }

    return value;
  });
}
