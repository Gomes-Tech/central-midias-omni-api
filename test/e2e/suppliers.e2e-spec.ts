import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Suppliers (e2e)', () => {
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

  it('GET /api/suppliers deve retornar url nula quando não houver documento', async () => {
    const response = await e2eRequest(app)
      .get('/api/suppliers')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body).toEqual({ url: null });
  });

  it('GET /api/suppliers deve ser acessível por usuário da organização sem backoffice', async () => {
    const response = await e2eRequest(app)
      .get('/api/suppliers')
      .set(e2eAuthHeaders(portalAccessToken))
      .expect(200);

    expect(response.body).toEqual({ url: null });
  });

  it('POST /api/suppliers deve recusar usuário sem canAccessBackoffice', async () => {
    await e2eRequest(app)
      .post('/api/suppliers')
      .set(e2eAuthHeaders(portalAccessToken))
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'fornecedores.pdf',
        contentType: 'application/pdf',
      })
      .expect(403);
  });

  it('POST /api/suppliers deve recusar envio sem arquivo', async () => {
    await e2eRequest(app)
      .post('/api/suppliers')
      .set(e2eAuthHeaders(accessToken))
      .expect(400);
  });

  it('POST /api/suppliers deve salvar o PDF e GET deve devolver a url pública', async () => {
    await e2eRequest(app)
      .post('/api/suppliers')
      .set(e2eAuthHeaders(accessToken))
      .attach('file', Buffer.from('%PDF-1.4'), {
        filename: 'fornecedores.pdf',
        contentType: 'application/pdf',
      })
      .expect(201);

    const response = await e2eRequest(app)
      .get('/api/suppliers')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(response.body).toEqual({ url: 'https://e2e.test/signed-url' });
  });
});
