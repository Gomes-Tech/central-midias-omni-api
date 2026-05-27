import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Modules (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/modules deve listar módulos', async () => {
    const response = await e2eRequest(app)
      .get('/api/modules')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/modules/select deve retornar opções', async () => {
    const response = await e2eRequest(app)
      .get('/api/modules/select')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/modules/:id deve retornar módulo', async () => {
    const response = await e2eRequest(app)
      .get('/api/modules/e2e-module-1')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    expect(response.body.name).toBe('organizations');
  });
});
