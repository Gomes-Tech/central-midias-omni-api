import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp, e2eAssetStorageMock } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';

describe('Assets (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  beforeEach(() => {
    e2eAssetStorageMock.upload.mockClear();
    e2eAssetStorageMock.getPublicUrl.mockClear();
    e2eAssetStorageMock.deleteFile.mockClear();
    e2eAssetStorageMock.deleteFiles.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve listar e buscar assets com URL pública, sem expor fileKey', async () => {
    const list = await e2eRequest(app)
      .get('/api/assets?searchTerm=Logo&page=1&limit=10')
      .set(e2eAuthHeaders(accessToken))
      .expect(200);

    expect(list.body.total).toBe(1);
    expect(list.body.data[0]).toMatchObject({
      id: E2E_IDS.assetId,
      name: 'Logo E2E',
      url: expect.stringContaining('https://e2e-assets.test/'),
    });
    expect(list.body.data[0].fileKey).toBeUndefined();

    const detail = await e2eRequest(app)
      .get(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(200);
    expect(detail.body.id).toBe(E2E_IDS.assetId);
  });

  it('não deve revelar asset para outra organização', async () => {
    await e2eRequest(app)
      .get(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken, E2E_IDS.otherOrgId))
      .expect(404);
  });

  it('deve cadastrar lote PNG usando o nome original', async () => {
    const response = await e2eRequest(app)
      .post('/api/assets')
      .set(e2eAuthHeaders(accessToken))
      .attach('files', png, {
        filename: 'Logo Primária.png',
        contentType: 'image/png',
      })
      .attach('files', png, {
        filename: 'Logo Secundária.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body.map((asset: { name: string }) => asset.name)).toEqual([
      'Logo Primária',
      'Logo Secundária',
    ]);
    expect(e2eAssetStorageMock.upload).toHaveBeenCalledTimes(2);
  });

  it('deve sanitizar SVG antes de enviá-lo ao storage', async () => {
    const svg = Buffer.from(
      '<svg viewBox="0 0 10 10" onload="alert(1)"><script>alert(2)</script><path d="M0 0L10 10" /></svg>',
    );

    await e2eRequest(app)
      .post('/api/assets')
      .set(e2eAuthHeaders(accessToken))
      .attach('files', svg, {
        filename: 'vetor.svg',
        contentType: 'image/svg+xml',
      })
      .expect(201);

    const prepared = e2eAssetStorageMock.upload.mock.calls[0][2] as {
      buffer: Buffer;
    };
    const storedSvg = prepared.buffer.toString('utf8');
    expect(storedSvg).toContain('viewBox="0 0 10 10"');
    expect(storedSvg).not.toMatch(/script|onload/i);
  });

  it('deve renomear, substituir e excluir definitivamente um asset', async () => {
    const rename = await e2eRequest(app)
      .patch(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken))
      .send({ name: 'Logo Atualizada' })
      .expect(200);

    expect(rename.body.name).toBe('Logo Atualizada');

    const update = await e2eRequest(app)
      .patch(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken))
      .attach('file', png, {
        filename: 'nova-logo.png',
        contentType: 'image/png',
      })
      .expect(200);

    expect(update.body.name).toBe('Logo Atualizada');
    expect(e2eAssetStorageMock.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('logo.png'),
    );

    await e2eRequest(app)
      .delete(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(204);

    await e2eRequest(app)
      .get(`/api/assets/${E2E_IDS.assetId}`)
      .set(e2eAuthHeaders(accessToken))
      .expect(404);
  });
});
