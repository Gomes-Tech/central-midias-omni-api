export function pickMaterialImageFile<T extends { mimeType: string }>(
  files: T[],
): T | null {
  return files.find((file) => file.mimeType.startsWith('image/')) ?? null;
}
