import sanitizeHtml from 'sanitize-html';

/**
 * Configuração padrão para sanitização de HTML
 * Remove todas as tags HTML e mantém apenas texto puro
 */
const DEFAULT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [],
  allowedAttributes: {},
  allowedStyles: {},
};

/**
 * Configuração para sanitização de texto rico (permite algumas tags básicas)
 * Útil para campos como descrições que podem precisar de formatação
 */
const RICH_TEXT_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
  allowedAttributes: {},
  allowedStyles: {},
};

/**
 * Sanitiza uma string removendo tags HTML e scripts maliciosos
 * @param input - String a ser sanitizada
 * @param allowRichText - Se true, permite algumas tags HTML básicas (p, br, strong, etc)
 * @returns String sanitizada
 */
export function sanitizeInput(
  input: string | undefined | null,
  allowRichText = false,
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const options = allowRichText ? RICH_TEXT_OPTIONS : DEFAULT_OPTIONS;

  return sanitizeHtml(input, options).trim();
}

/**
 * Sanitiza um objeto recursivamente
 * @param obj - Objeto a ser sanitizado
 * @param allowRichText - Se true, permite algumas tags HTML básicas
 * @returns Objeto sanitizado
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  allowRichText = false,
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeInput(sanitized[key], allowRichText) as any;
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) =>
        typeof item === 'string'
          ? sanitizeInput(item, allowRichText)
          : typeof item === 'object' && item !== null
            ? sanitizeObject(item, allowRichText)
            : item,
      ) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key], allowRichText) as any;
    }
  }

  return sanitized;
}
