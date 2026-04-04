import { TokenPassword } from '../entities';

export function makeTokenPassword(
  overrides: Partial<{
    id: string;
    token: string;
    email: string;
    expiresAt: Date;
    used: boolean;
  }> = {},
): TokenPassword {
  return new TokenPassword(
    overrides.id ?? 'tp-id',
    overrides.token ?? 'hashed-token',
    overrides.email ?? 'user@test.com',
    overrides.expiresAt ?? new Date(Date.now() + 60_000),
    overrides.used ?? false,
  );
}
