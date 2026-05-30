import { sanitizeInput } from '@common/utils';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readMaterialTagsField(
  obj: Record<string, unknown>,
): unknown {
  if (obj.tags !== undefined && obj.tags !== null) {
    return obj.tags;
  }

  if (obj['tags[]'] !== undefined && obj['tags[]'] !== null) {
    return obj['tags[]'];
  }

  return undefined;
}

export function normalizeMaterialTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parseValue = (current: unknown): string[] => {
    if (Array.isArray(current)) {
      return current.flatMap(parseValue);
    }

    if (isRecord(current)) {
      const name = typeof current.name === 'string' ? current.name : undefined;

      if (name) {
        return parseValue(name);
      }

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

  return parseValue(value)
    .map((tag) => sanitizeInput(tag))
    .filter(Boolean);
}
