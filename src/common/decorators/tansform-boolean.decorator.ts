import { Transform } from 'class-transformer';

export function transformBoolean(value: unknown): unknown {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return value;
}

export function TransformBoolean() {
  return Transform(({ value }) => transformBoolean(value), {
    toClassOnly: true,
  });
}
