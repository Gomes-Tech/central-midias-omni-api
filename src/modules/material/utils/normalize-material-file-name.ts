import { posix } from 'node:path';

export function normalizeMaterialFileName(originalName: string): string {
  const source = originalName || '';
  const decoded = Buffer.from(source, 'latin1').toString('utf8');
  const normalizedEncoding = decoded.includes('\uFFFD') ? source : decoded;
  const baseName = posix.basename(normalizedEncoding.replaceAll('\\', '/'));
  const withoutControlCharacters = baseName.replace(
    /[\u0000-\u001F\u007F]/g,
    '',
  );

  return withoutControlCharacters.trim() || 'arquivo';
}
