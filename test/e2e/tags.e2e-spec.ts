import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Tags (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/tags deve listar tags da organização', async () => {
    const response = await e2eRequest(app)
      .get('/api/tags')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.some((t: { id: string }) => t.id === E2E_IDS.tagId)).toBe(
      true,
    );
  });

  it('GET /api/tags/select deve retornar opções', async () => {
    const response = await e2eRequest(app)
      .get('/api/tags/select')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
  });

  it('GET /api/tags/:id deve retornar tag', async () => {
    const response = await e2eRequest(app)
      .get(`/api/tags/${E2E_IDS.tagId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.tagId);
  });

  it('POST /api/tags deve criar tag', async () => {
    const response = await e2eRequest(app)
      .post('/api/tags')
      .set(e2eAuthHeaders(accessToken))
      .send({ name: 'Nova Tag E2E' })
      .expect(201);

    expect(response.body.name).toBe('Nova Tag E2E');
  });

  it('PATCH /api/tags/:id deve atualizar tag', async () => {
    const response = await e2eRequest(app)
      .patch(`/api/tags/${E2E_IDS.tagId}`)
      .set(e2eAuthHeaders(accessToken))
      .send({ name: 'Tag Atualizada E2E' })
      .expect(200);

    expect(response.body.name).toBe('Tag Atualizada E2E');
  });
});
