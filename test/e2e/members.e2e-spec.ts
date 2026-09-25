import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Members (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/members deve listar membros', async () => {
    const response = await e2eRequest(app)
      .get('/api/members')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/members/me deve retornar membro atual', async () => {
    const response = await e2eRequest(app)
      .get('/api/members/me')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.name).toBe('ADMIN');
    expect(response.body.canAccessBackoffice).toBe(true);
  });

  it('GET /api/members/:id deve retornar membro', async () => {
    const response = await e2eRequest(app)
      .get(`/api/members/${E2E_IDS.memberId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body.id).toBe(E2E_IDS.memberId);
  });

  it('GET /api/members/important-dates não deve vazar dados de outra organização', async () => {
    const { accessToken: portalToken } = await e2eSignIn(app, 'portal@e2e.com');

    await e2eRequest(app)
      .get('/api/members/important-dates')
      .set(e2eAuthHeaders(portalToken, E2E_IDS.otherOrgId))
      .expect(403);
  });

  it('GET /api/members/important-dates deve listar quando o usuário for membro', async () => {
    const { accessToken: portalToken } = await e2eSignIn(app, 'portal@e2e.com');

    const response = await e2eRequest(app)
      .get('/api/members/important-dates')
      .set(e2eAuthHeaders(portalToken, E2E_IDS.orgId))
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
