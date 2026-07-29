import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Material templates (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let agentToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken: adminToken } = await e2eSignIn(app));
    ({ accessToken: agentToken } = await e2eSignIn(app, 'portal@e2e.com'));
  });

  afterAll(async () => {
    await app.close();
  });

  it('executa o ciclo admin/agente, revisão concorrente e draft indisponível', async () => {
    const adminView = await e2eRequest(app)
      .get(`/api/materials/${E2E_IDS.customizableMaterialId}/template`)
      .set(e2eAuthHeaders(adminToken))
      .expect(200);

    expect(adminView.body).toEqual(
      expect.objectContaining({
        materialId: E2E_IDS.customizableMaterialId,
        status: 'PUBLISHED',
        revision: 0,
        missingAssetIds: [],
      }),
    );
    expect(adminView.body.baseImage.url).toBe('https://e2e.test/signed-url');
    expect(adminView.body.assets[0].id).toBe(E2E_IDS.assetId);

    await e2eRequest(app)
      .get(
        `/api/materials/${E2E_IDS.customizableMaterialId}/customization-template`,
      )
      .set(e2eAuthHeaders(agentToken))
      .expect(200)
      .expect(({ body }) => {
        expect(body.status).toBe('PUBLISHED');
        expect(body.legacyImport).toBeNull();
      });

    const changedDocument = {
      ...adminView.body.document,
      layers: adminView.body.document.layers.map(
        (layer: Record<string, unknown>) =>
          layer.type === 'text'
            ? { ...layer, value: 'Novo valor padrão' }
            : layer,
      ),
    };

    const saved = await e2eRequest(app)
      .put(`/api/materials/${E2E_IDS.customizableMaterialId}/template`)
      .set(e2eAuthHeaders(adminToken))
      .send({ revision: 0, document: changedDocument })
      .expect(200);

    expect(saved.body.status).toBe('DRAFT');
    expect(saved.body.revision).toBe(1);

    await e2eRequest(app)
      .get(
        `/api/materials/${E2E_IDS.customizableMaterialId}/customization-template`,
      )
      .set(e2eAuthHeaders(agentToken))
      .expect(404);

    const published = await e2eRequest(app)
      .post(`/api/materials/${E2E_IDS.customizableMaterialId}/template/publish`)
      .set(e2eAuthHeaders(adminToken))
      .send({ revision: 1 })
      .expect(201);

    expect(published.body.status).toBe('PUBLISHED');
    expect(published.body.revision).toBe(2);

    await e2eRequest(app)
      .put(`/api/materials/${E2E_IDS.customizableMaterialId}/template`)
      .set(e2eAuthHeaders(adminToken))
      .send({ revision: 0, document: changedDocument })
      .expect(409);
  });
});
