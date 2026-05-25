import { sanitizeInput } from '@common/utils';

export function normalizeMaterialTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parseValue = (current: unknown): string[] => {
    if (Array.isArray(current)) {
      return current.flatMap(parseValue);
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

    return [trimmedValue];
  };

  return parseValue(value)
    .map((tag) => sanitizeInput(tag))
    .filter(Boolean);
}
