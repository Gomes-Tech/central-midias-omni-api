import { INestApplication } from '@nestjs/common';
import { ReportType } from '../../src/modules/reports/entities';
import { ExportReportUseCase } from '../../src/modules/reports/use-cases/export-report.use-case';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';
import { getE2eStore } from '../helpers/e2e-prisma.store';

describe('Search reports (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve registrar a busca do admin uma vez e retorná-la no relatório', async () => {
    const searchId = 'd36f81d2-cb53-43c7-baf9-c0e72490ba9b';
    const headers = e2eAuthHeaders(accessToken);
    const store = getE2eStore();
    const material = store.materials.find(
      (item) => item.id === E2E_IDS.materialId,
    );
    const extraTags = [
      {
        id: '56565656-5656-4656-8656-565656565656',
        organizationId: E2E_IDS.orgId,
        name: 'Tag A',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '57575757-5757-4757-8757-575757575757',
        organizationId: E2E_IDS.orgId,
        name: 'Tag B',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    store.tags.push(...extraTags);
    (material?.tags as Record<string, unknown>[]).push(...extraTags);

    for (let request = 0; request < 2; request += 1) {
      const response = await e2eRequest(app)
        .get('/api/materials/search')
        .query({ term: 'Material E2E', searchId })
        .set(headers)
        .expect(200);

      expect(response.body.total).toBe(1);
    }

    expect(store.tagSearches).toHaveLength(3);
    expect(store.tagSearches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          searchId,
          organizationId: E2E_IDS.orgId,
          userId: E2E_IDS.userId,
          term: 'material e2e',
          search: 'Material E2E',
          tagId: E2E_IDS.tagId,
          tagName: 'Tag E2E',
        }),
        expect.objectContaining({ tagName: 'Tag A' }),
        expect.objectContaining({ tagName: 'Tag B' }),
      ]),
    );

    const report = await e2eRequest(app)
      .get('/api/reports/searches/top')
      .set(headers)
      .expect(200);

    expect(report.body).toEqual({
      data: [
        {
          search: 'Material E2E',
          tag: 'Tag A, Tag B, Tag E2E',
          quantity: 3,
        },
      ],
      total: 1,
      totalPages: 1,
      page: 1,
    });

    const exported = await app
      .get(ExportReportUseCase)
      .execute(ReportType.SEARCHES_TOP, E2E_IDS.orgId);

    expect(exported.filename).toBe('relatorio-buscas.csv');
    expect(exported.content).toBe(
      'busca,tag,quantidade\nMaterial E2E,"Tag A, Tag B, Tag E2E",3',
    );
  });
});
