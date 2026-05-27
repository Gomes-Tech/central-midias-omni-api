import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2ePublicHeaders, e2eRequest } from '../helpers/e2e-http';

function fileHeaders(): Record<string, string> {
  return {
    ...e2ePublicHeaders(),
    'X-Organization-ID': E2E_IDS.orgId,
  };
}

describe('App (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api deve retornar Hello World', async () => {
    const response = await e2eRequest(app)
      .get('/api')
      .set(fileHeaders())
      .expect(200);

    expect(response.text).toBe('Hello World!');
  });

  it('GET /api/file?path= deve retornar URL assinada', async () => {
    const response = await e2eRequest(app)
      .get('/api/file')
      .query({ path: 'uploads/test.png' })
      .set(fileHeaders())
      .expect(200);

    expect(response.text).toBe('https://e2e.test/signed-url');
  });

  it('GET /api/file/:path deve retornar URL assinada', async () => {
    const response = await e2eRequest(app)
      .get('/api/file/uploads%2Ftest.png')
      .set(fileHeaders())
      .expect(200);

    expect(response.text).toBe('https://e2e.test/signed-url');
  });
});
