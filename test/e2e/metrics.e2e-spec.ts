import { INestApplication } from '@nestjs/common';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2ePublicHeaders, e2eRequest } from '../helpers/e2e-http';

describe('Metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/metrics deve expor métricas Prometheus', async () => {
    const response = await e2eRequest(app)
      .get('/api/metrics')
      .set(e2ePublicHeaders())
      .expect(200);

    expect(response.text).toContain('# HELP');
  });
});
