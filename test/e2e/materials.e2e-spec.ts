import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Materials (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/materials deve listar materiais', async () => {
    const response = await e2eRequest(app)
      .get('/api/materials')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/materials/:id deve retornar material', async () => {
    const response = await e2eRequest(app)
      .get(`/api/materials/${E2E_IDS.materialId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.materialId);
  });

  it('GET /api/materials/:id/files deve listar arquivos', async () => {
    const response = await e2eRequest(app)
      .get(`/api/materials/${E2E_IDS.materialId}/files`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
