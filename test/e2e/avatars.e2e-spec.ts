import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Avatars (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let portalAccessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
    ({ accessToken: portalAccessToken } = await e2eSignIn(
      app,
      'portal@e2e.com',
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/avatars deve retornar urls nulas quando não houver avatares', async () => {
    const response = await e2eRequest(app)
      .get('/api/avatars')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body).toEqual({
      standardAvatarUrl: null,
      customizableAvatarUrl: null,
    });
  });

  it('GET /api/avatars deve ser acessível por usuário da organização sem backoffice', async () => {
    const response = await e2eRequest(app)
      .get('/api/avatars')
      .set(e2eAuthHeaders(portalAccessToken))
      .expect(200);

    expect(response.body).toEqual({
      standardAvatarUrl: null,
      customizableAvatarUrl: null,
    });
  });

  it('POST /api/avatars/standard deve recusar usuário sem canAccessBackoffice', async () => {
    await e2eRequest(app)
      .post('/api/avatars/standard')
      .set(e2eAuthHeaders(portalAccessToken))
      .attach('file', Buffer.from('fake-image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(403);
  });

  it('POST /api/avatars/standard deve recusar envio sem arquivo', async () => {
    await e2eRequest(app)
      .post('/api/avatars/standard')
      .set(e2eAuthHeaders(accessToken))
      .expect(400);
  });

  it('POST /api/avatars/standard deve salvar a imagem e GET deve devolver a url pública', async () => {
    await e2eRequest(app)
      .post('/api/avatars/standard')
      .set(e2eAuthHeaders(accessToken))
      .attach('file', Buffer.from('fake-image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    const response = await e2eRequest(app)
      .get('/api/avatars')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body).toEqual({
      standardAvatarUrl: 'https://e2e.test/signed-url',
      customizableAvatarUrl: null,
    });
  });
});
