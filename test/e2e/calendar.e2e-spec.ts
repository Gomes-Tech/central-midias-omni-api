import { INestApplication } from '@nestjs/common';
import { E2E_IDS, E2E_PASSWORD } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import {
  e2eAuthHeaders,
  e2eRequest,
  e2eSignIn,
} from '../helpers/e2e-http';
import { getE2eStore } from '../helpers/e2e-prisma.store';

describe('Calendar (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let portalToken: string;

  beforeAll(async () => {
    app = await createE2eApp();
    ({ accessToken: adminToken } = await e2eSignIn(app));
    ({ accessToken: portalToken } = await e2eSignIn(
      app,
      'portal@e2e.com',
      E2E_PASSWORD,
    ));
  });

  afterAll(async () => {
    await app.close();
  });

  it('1) backoffice lista todos os eventos ativos da org', async () => {
    const response = await e2eRequest(app)
      .get('/api/calendar/events')
      .set(e2eAuthHeaders(adminToken))
      .expect(200);

    const ids = response.body.map((event: { id: string }) => event.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        E2E_IDS.eventNoCategoryId,
        E2E_IDS.eventCategoryAId,
        E2E_IDS.eventCategoryCId,
      ]),
    );
    expect(ids).not.toContain(E2E_IDS.eventDeletedId);
  });

  it('2) portal vê eventos em A + sem materiais; não vê C', async () => {
    const response = await e2eRequest(app)
      .get('/api/calendar/events')
      .set(e2eAuthHeaders(portalToken))
      .expect(200);

    const ids = response.body.map((event: { id: string }) => event.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        E2E_IDS.eventNoCategoryId,
        E2E_IDS.eventCategoryAId,
      ]),
    );
    expect(ids).not.toContain(E2E_IDS.eventCategoryCId);
  });

  it('3) portal pedindo detalhe de evento em C → 404', async () => {
    await e2eRequest(app)
      .get(`/api/calendar/events/${E2E_IDS.eventCategoryCId}`)
      .set(e2eAuthHeaders(portalToken))
      .expect(404);
  });

  it('4) GET event-types para portal retorna legendas ativas', async () => {
    const response = await e2eRequest(app)
      .get('/api/calendar/event-types')
      .query({ isActive: true })
      .set(e2eAuthHeaders(portalToken))
      .expect(200);

    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0].id).toBe(E2E_IDS.eventTypeId);
  });

  it('5) create com materialId inválido → erro', async () => {
    await e2eRequest(app)
      .post('/api/calendar/events')
      .set(e2eAuthHeaders(adminToken))
      .send({
        title: 'Inválido',
        description: 'teste',
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-02T00:00:00.000Z',
        eventTypeId: E2E_IDS.eventTypeId,
        materialIds: ['ffffffff-ffff-4fff-8fff-ffffffffffff'],
      })
      .expect(400);
  });

  it('6) create com endDate < startDate → 400', async () => {
    await e2eRequest(app)
      .post('/api/calendar/events')
      .set(e2eAuthHeaders(adminToken))
      .send({
        title: 'Datas inválidas',
        description: 'teste',
        startDate: '2026-06-10T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
        eventTypeId: E2E_IDS.eventTypeId,
      })
      .expect(400);
  });

  it('7) delete de tipo com eventos ativos → 409', async () => {
    await e2eRequest(app)
      .delete(`/api/calendar/event-types/${E2E_IDS.eventTypeId}`)
      .set(e2eAuthHeaders(adminToken))
      .expect(409);
  });

  it('8) PATCH com materialIds vazio desvincula e fica visível no portal', async () => {
    await e2eRequest(app)
      .patch(`/api/calendar/events/${E2E_IDS.eventCategoryCId}`)
      .set(e2eAuthHeaders(adminToken))
      .send({ materialIds: [] })
      .expect(200);

    const response = await e2eRequest(app)
      .get('/api/calendar/events')
      .set(e2eAuthHeaders(portalToken))
      .expect(200);

    const ids = response.body.map((event: { id: string }) => event.id);
    expect(ids).toContain(E2E_IDS.eventCategoryCId);
  });

  it('9) query from/to retorna só eventos que intersectam o intervalo', async () => {
    const store = getE2eStore();
    store.calendarEvents.push({
      id: 'e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5',
      organizationId: E2E_IDS.orgId,
      eventTypeId: E2E_IDS.eventTypeId,
      title: 'Fora do range',
      description: 'Julho',
      startDate: new Date('2026-07-01T00:00:00.000Z'),
      endDate: new Date('2026-07-10T23:59:59.000Z'),
      externalUrl: null,
      createdByUserId: E2E_IDS.userId,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await e2eRequest(app)
      .get('/api/calendar/events')
      .query({
        from: '2026-05-01T00:00:00.000Z',
        to: '2026-05-31T23:59:59.000Z',
      })
      .set(e2eAuthHeaders(adminToken))
      .expect(200);

    const ids = response.body.map((event: { id: string }) => event.id);
    expect(ids).not.toContain('e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5');
    expect(ids).toContain(E2E_IDS.eventNoCategoryId);
  });

  it('10) soft-deleted não aparece no GET padrão', async () => {
    const response = await e2eRequest(app)
      .get('/api/calendar/events')
      .set(e2eAuthHeaders(adminToken))
      .expect(200);

    const ids = response.body.map((event: { id: string }) => event.id);
    expect(ids).not.toContain(E2E_IDS.eventDeletedId);
  });
});
