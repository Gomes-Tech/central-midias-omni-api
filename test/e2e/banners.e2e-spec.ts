import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Banners (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/banners deve listar banners', async () => {
    const response = await e2eRequest(app)
      .get('/api/banners')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/banners/list deve listar banners ativos', async () => {
    const response = await e2eRequest(app)
      .get('/api/banners/list')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/banners/:id deve retornar banner', async () => {
    const response = await e2eRequest(app)
      .get(`/api/banners/${E2E_IDS.bannerId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.bannerId);
  });
});
