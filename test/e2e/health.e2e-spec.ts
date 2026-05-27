import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2ePublicHeaders, e2eRequest } from '../helpers/e2e-http';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health/live deve retornar status ok', async () => {
    const response = await e2eRequest(app)
      .get('/api/health/live')
      .set(e2ePublicHeaders())
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptime).toBe('number');
  });

  it('GET /api/health deve incluir database e cache', async () => {
    const response = await e2eRequest(app)
      .get('/api/health')
      .set(e2ePublicHeaders())
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: { status: 'ok' },
      cache: { status: 'ok' },
    });
  });

  it('GET /api/health/ready deve retornar status de prontidão', async () => {
    const response = await e2eRequest(app)
      .get('/api/health/ready')
      .set(e2ePublicHeaders());

    expect([200, 503]).toContain(response.status);
    expect(['ok', 'error']).toContain(response.body.status);
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('cache');
  });
});
