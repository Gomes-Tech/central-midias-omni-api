export function toSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export function buildSlugPath(
  parentSlugPath: string | null | undefined,
  slug: string,
): string {
  return parentSlugPath ? `${parentSlugPath}/${slug}` : slug;
}
