import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/categories deve listar categorias', async () => {
    const response = await e2eRequest(app)
      .get('/api/categories')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/categories/tree deve retornar árvore', async () => {
    const response = await e2eRequest(app)
      .get('/api/categories/tree')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });

  it('GET /api/categories/:id deve retornar categoria', async () => {
    const response = await e2eRequest(app)
      .get(`/api/categories/${E2E_IDS.categoryId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.categoryId);
  });
});
