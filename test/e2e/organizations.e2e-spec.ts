import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Organizations (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/organizations deve listar organizações', async () => {
    const response = await e2eRequest(app)
      .get('/api/organizations')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/organizations/select deve retornar opções', async () => {
    const response = await e2eRequest(app)
      .get('/api/organizations/select')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/organizations/accessible deve retornar acessíveis ao usuário', async () => {
    const response = await e2eRequest(app)
      .get('/api/organizations/accessible')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/organizations/:id deve retornar detalhe', async () => {
    const response = await e2eRequest(app)
      .get(`/api/organizations/${E2E_IDS.orgId}`)
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.orgId);
  });
});
