import { JWT_SERVICE } from '@infrastructure/jwt';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { Agent } from 'supertest';
import { E2E_IDS, E2E_PASSWORD } from '../fixtures/e2e-seed';

export const E2E_API_KEY =
  process.env.SERVER_AUTH_SECRET ?? 'e2e-server-auth-secret-32chars-min';

export function e2eRequest(app: INestApplication): Agent {
  return request(app.getHttpServer());
}

export async function e2eSignIn(
  app: INestApplication,
  email = 'admin@admin.com',
  password = E2E_PASSWORD,
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await e2eRequest(app)
    .post('/api/auth/sign-in')
    .set('X-Api-Key', E2E_API_KEY)
    .send({ email, password })
    .expect(200);

  return {
    accessToken: response.body.accessToken,
    refreshToken: response.body.refreshToken,
  };
}

export function e2eAuthHeaders(
  accessToken: string,
  organizationId: string = E2E_IDS.orgId,
): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'X-Api-Key': E2E_API_KEY,
    'X-Organization-ID': organizationId,
  };
}

export function e2ePublicHeaders(): Record<string, string> {
  return { 'X-Api-Key': E2E_API_KEY };
}

export function e2eSignToken(app: INestApplication, userId = E2E_IDS.userId): string {
  const jwt = app.get<JwtService>(JWT_SERVICE);
  return jwt.sign({ id: userId, jti: 'e2e-jti' });
}
