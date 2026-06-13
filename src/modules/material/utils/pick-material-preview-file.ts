export function pickMaterialPreviewFile<T extends { mimeType: string }>(
  files: T[],
): T | null {
  if (files.length === 0) {
    return null;
  }

  if (files.length === 1) {
    return files[0];
  }

  const imageFile = files.find((file) => file.mimeType.startsWith('image/'));

  return imageFile ?? files[0];
}
