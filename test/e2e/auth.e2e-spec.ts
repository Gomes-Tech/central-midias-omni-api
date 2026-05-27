import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2ePublicHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/sign-in deve autenticar admin seed', async () => {
    const response = await e2eRequest(app)
      .post('/api/auth/sign-in')
      .set(e2ePublicHeaders())
      .send({ email: 'admin@admin.com', password: 'V9!rK#4pT@7zL$2qX8mF' })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
    expect(response.body.canAccessBackoffice).toBe(true);
  });

  it('POST /api/auth/sign-in deve falhar com credenciais inválidas', async () => {
    await e2eRequest(app)
      .post('/api/auth/sign-in')
      .set(e2ePublicHeaders())
      .send({ email: 'admin@admin.com', password: 'senha-errada' })
      .expect(400);
  });

  it('POST /api/auth/refresh deve renovar tokens', async () => {
    const { refreshToken } = await e2eSignIn(app);

    const response = await e2eRequest(app)
      .post('/api/auth/refresh')
      .set(e2ePublicHeaders())
      .send({ refreshToken })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });

  it('POST /api/auth/logout deve concluir com sucesso', async () => {
    const { accessToken, refreshToken } = await e2eSignIn(app);

    await e2eRequest(app)
      .post('/api/auth/logout')
      .set(e2ePublicHeaders())
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);
  });
});
