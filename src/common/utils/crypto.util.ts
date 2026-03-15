import { timingSafeEqual } from 'crypto';

/**
 * Comparação segura contra timing attacks
 *
 * Usa `crypto.timingSafeEqual` do Node.js para garantir que a comparação
 * sempre leve o mesmo tempo, independentemente de onde a diferença ocorra.
 *
 * Isso previne ataques de timing onde um atacante pode inferir informações
 * sobre strings secretas (como tokens, senhas, API keys) medindo o tempo
 * de resposta de comparações.
 *
 * @param a - Primeira string a ser comparada
 * @param b - Segunda string a ser comparada
 * @returns true se as strings forem iguais, false caso contrário
 *
 * @example
 * ```typescript
 * const apiKey = request.headers['x-api-key'];
 * const serverApiKey = process.env.SERVER_AUTH_SECRET;
 *
 * if (!apiKey || !secureCompare(apiKey, serverApiKey)) {
 *   throw new UnauthorizedException('Authentication required');
 * }
 * ```
 *
 * @remarks
 * - Se as strings tiverem tamanhos diferentes, retorna false imediatamente
 *   (isso é seguro porque não revela informações sobre o conteúdo)
 * - Usa Buffer para garantir que a comparação seja byte-a-byte
 * - Sempre executa em tempo constante para strings do mesmo tamanho
 */
export function secureCompare(a: string, b: string): boolean {
  // Se uma das strings for vazia ou undefined, retornar false
  if (!a || !b) {
    return false;
  }

  // Se os tamanhos forem diferentes, retornar false imediatamente
  // Isso é seguro porque não revela informações sobre o conteúdo
  if (a.length !== b.length) {
    return false;
  }

  // Converter strings para Buffer para comparação byte-a-byte
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');

  try {
    // timingSafeEqual sempre executa em tempo constante para buffers do mesmo tamanho
    return timingSafeEqual(bufferA, bufferB);
  } catch {
    // Se os buffers tiverem tamanhos diferentes (não deveria acontecer aqui),
    // retornar false
    return false;
  }
}
