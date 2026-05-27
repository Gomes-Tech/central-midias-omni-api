import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import {
  e2eAuthHeaders,
  e2ePublicHeaders,
  e2eRequest,
  e2eSignIn,
} from '../helpers/e2e-http';

describe('Segurança HTTP (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve retornar 401 sem X-Api-Key em rota protegida', async () => {
    await e2eRequest(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Organization-ID', E2E_IDS.orgId)
      .expect(401);
  });

  it('deve retornar 401 sem Bearer em rota protegida', async () => {
    await e2eRequest(app)
      .get('/api/tags')
      .set(e2ePublicHeaders())
      .set('X-Organization-ID', E2E_IDS.orgId)
      .expect(401);
  });

  it('deve retornar 400 sem X-Organization-ID em rota com tenant', async () => {
    await e2eRequest(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('X-Api-Key', e2ePublicHeaders()['X-Api-Key'])
      .expect(400);
  });

  it('deve retornar 404 para organização inexistente', async () => {
    await e2eRequest(app)
      .get('/api/tags')
      .set(e2eAuthHeaders(accessToken, '00000000-0000-4000-8000-000000009999'))
      .expect(404);
  });
});
