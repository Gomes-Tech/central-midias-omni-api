export function renameFile(filename: string) {
  // Separa extensão
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
  const extension = lastDotIndex !== -1 ? filename.slice(lastDotIndex) : '';

  // Mapa de caracteres UTF8 para ASCII
  const utf8ToAsciiMap: Record<string, string> = {
    á: 'a',
    à: 'a',
    ã: 'a',
    â: 'a',
    ä: 'a',
    é: 'e',
    è: 'e',
    ê: 'e',
    ë: 'e',
    í: 'i',
    ì: 'i',
    î: 'i',
    ï: 'i',
    ó: 'o',
    ò: 'o',
    õ: 'o',
    ô: 'o',
    ö: 'o',
    ú: 'u',
    ù: 'u',
    û: 'u',
    ü: 'u',
    ç: 'c',
    ñ: 'n',
    Á: 'A',
    À: 'A',
    Ã: 'A',
    Â: 'A',
    Ä: 'A',
    É: 'E',
    È: 'E',
    Ê: 'E',
    Ë: 'E',
    Í: 'I',
    Ì: 'I',
    Î: 'I',
    Ï: 'I',
    Ó: 'O',
    Ò: 'O',
    Õ: 'O',
    Ô: 'O',
    Ö: 'O',
    Ú: 'U',
    Ù: 'U',
    Û: 'U',
    Ü: 'U',
    Ç: 'C',
    Ñ: 'N',
  };

  let formatted = name;

  // Substitui acentos
  for (const key in utf8ToAsciiMap) {
    formatted = formatted.replaceAll(key, utf8ToAsciiMap[key]);
  }

  // Substitui espaços e caracteres problemáticos por hífen
  formatted = formatted.replace(/[^a-zA-Z0-9]/g, '-');

  // Remove hífens duplicados
  formatted = formatted.replace(/-+/g, '-');

  // Remove hífen no início e no fim
  formatted = formatted.replace(/^-|-$/g, '');

  return formatted + extension.toLowerCase();
}
