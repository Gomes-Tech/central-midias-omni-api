import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Roles (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/roles deve listar perfis', async () => {
    const response = await e2eRequest(app)
      .get('/api/roles')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((r: { name: string }) => r.name === 'ADMIN')).toBe(true);
  });

  it('GET /api/roles/select deve retornar opções', async () => {
    const response = await e2eRequest(app)
      .get('/api/roles/select')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(
      response.body.some((r: { label: string }) => r.label === 'Editor'),
    ).toBe(true);
  });

  it('GET /api/roles/:id deve retornar perfil', async () => {
    const response = await e2eRequest(app)
      .get(`/api/roles/${E2E_IDS.roleId}`)
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.roleId);
  });
});
