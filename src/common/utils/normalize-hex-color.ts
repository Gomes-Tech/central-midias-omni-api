const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_COLOR_REGEX.test(value);
}

export function normalizeHexColor(value: string): string {
  return value.trim().toUpperCase();
}
