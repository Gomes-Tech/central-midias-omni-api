export function renameFile(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  const [name, extension] =
    dotIndex !== -1
      ? [filename.slice(0, dotIndex), filename.slice(dotIndex)]
      : [filename, ''];

  const formatted = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return formatted + extension.toLowerCase();
}
