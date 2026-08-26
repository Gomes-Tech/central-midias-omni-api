export const MATERIAL_EXPORT_TYPES = ['png', 'jpg', 'pdf', 'print_pdf'] as const;

export type MaterialExportType = (typeof MATERIAL_EXPORT_TYPES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMaterialExportType(value: string): value is MaterialExportType {
  return (MATERIAL_EXPORT_TYPES as readonly string[]).includes(value);
}

export function readMaterialExportTypesField(
  obj: Record<string, unknown>,
): unknown {
  if (obj.exportTypes !== undefined && obj.exportTypes !== null) {
    return obj.exportTypes;
  }

  if (obj['exportTypes[]'] !== undefined && obj['exportTypes[]'] !== null) {
    return obj['exportTypes[]'];
  }

  return undefined;
}

export function normalizeMaterialExportTypes(
  value: unknown,
): MaterialExportType[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parseValue = (current: unknown): string[] => {
    if (Array.isArray(current)) {
      return current.flatMap(parseValue);
    }

    if (isRecord(current)) {
      return [];
    }

    if (typeof current !== 'string') {
      return [];
    }

    const trimmedValue = current.trim();
    if (!trimmedValue) {
      return [];
    }

    if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
      try {
        const parsedValue: unknown = JSON.parse(trimmedValue);
        return Array.isArray(parsedValue)
          ? parsedValue.flatMap(parseValue)
          : [];
      } catch {
        return [trimmedValue];
      }
    }

    if (trimmedValue.includes(',')) {
      return trimmedValue.split(',').flatMap((part) => parseValue(part));
    }

    return [trimmedValue];
  };

  const uniqueTypes = new Set<MaterialExportType>();
  for (const item of parseValue(value)) {
    if (isMaterialExportType(item)) {
      uniqueTypes.add(item);
    }
  }

  return [...uniqueTypes];
}

export function normalizePrintPresetId(
  value: unknown,
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function toDigitalMime(
  mimeType?: string | null,
): 'image/png' | 'image/jpeg' | null {
  const value = mimeType?.toLowerCase();
  if (value === 'image/png') {
    return 'image/png';
  }
  if (value === 'image/jpeg' || value === 'image/jpg') {
    return 'image/jpeg';
  }
  return null;
}

export function toDigitalMimeTypes(
  exportTypes: MaterialExportType[],
  baseMimeType?: string | null,
): Array<'image/png' | 'image/jpeg'> {
  if (exportTypes.length === 0) {
    const mime = toDigitalMime(baseMimeType);
    return mime ? [mime] : ['image/png'];
  }

  const mimeTypes: Array<'image/png' | 'image/jpeg'> = [];
  if (exportTypes.includes('png')) {
    mimeTypes.push('image/png');
  }
  if (exportTypes.includes('jpg')) {
    mimeTypes.push('image/jpeg');
  }
  return mimeTypes;
}

export function resolveTemplateExportConfig(input: {
  exportTypes?: MaterialExportType[];
  printPresetId?: string | null;
  baseMimeType?: string | null;
}): {
  allowedExportTypes: MaterialExportType[];
  digitalExportMimeType: 'image/png' | 'image/jpeg' | null;
  printPresetId: string | null;
} {
  const allowedExportTypes = input.exportTypes ?? [];
  const mimeTypes = toDigitalMimeTypes(allowedExportTypes, input.baseMimeType);

  return {
    allowedExportTypes,
    digitalExportMimeType: mimeTypes[0] ?? null,
    printPresetId: allowedExportTypes.includes('print_pdf')
      ? (input.printPresetId ?? null)
      : null,
  };
}
