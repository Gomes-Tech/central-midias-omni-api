import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/users deve listar usuários', async () => {
    const response = await e2eRequest(app)
      .get('/api/users')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/users/me deve retornar usuário autenticado', async () => {
    const response = await e2eRequest(app)
      .get('/api/users/me')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.email).toBe('admin@admin.com');
    expect(response.body.canAccessBackoffice).toBe(true);
  });

  it('GET /api/users/:id deve retornar usuário por id', async () => {
    const response = await e2eRequest(app)
      .get(`/api/users/${E2E_IDS.userId}`)
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.userId);
    expect(response.body.email).toBe('admin@admin.com');
  });
});
