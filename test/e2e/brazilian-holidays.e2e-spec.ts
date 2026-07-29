import { INestApplication } from '@nestjs/common';
import { E2E_IDS } from '../fixtures/e2e-seed';
import { createE2eApp } from '../helpers/create-e2e-app';
import { e2eAuthHeaders, e2eRequest, e2eSignIn } from '../helpers/e2e-http';
import { E2ePrismaService } from '../helpers/e2e-prisma.service';

const { seedHolidaysForOrganization } = require('../../prisma/lib/brazilian-holidays');

describe('Brazilian holidays seed (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let prisma: E2ePrismaService;

  beforeAll(async () => {
    app = await createE2eApp();
    prisma = app.get(E2ePrismaService);
    ({ accessToken } = await e2eSignIn(app));
  });

  afterAll(async () => {
    await app.close();
  });

  it('deve criar tipo Feriado, eventos e ser idempotente', async () => {
    const firstRun = await prisma.$transaction(async (tx) =>
      seedHolidaysForOrganization(tx, E2E_IDS.orgId, E2E_IDS.userId),
    );

    expect(firstRun.eventTypeCreated).toBe(true);
    expect(firstRun.created).toBe(275);
    expect(firstRun.skipped).toBe(0);

    const secondRun = await prisma.$transaction(async (tx) =>
      seedHolidaysForOrganization(tx, E2E_IDS.orgId, E2E_IDS.userId),
    );

    expect(secondRun.eventTypeCreated).toBe(false);
    expect(secondRun.created).toBe(0);
    expect(secondRun.updated).toBe(0);
    expect(secondRun.skipped).toBe(275);

    const eventTypesResponse = await e2eRequest(app)
      .get('/api/calendar/event-types')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    const holidayType = eventTypesResponse.body.find(
      (eventType: { name: string }) =>
        eventType.name.toLowerCase() === 'feriado',
    );

    expect(holidayType).toBeDefined();
    expect(holidayType.slug).toBe('feriado');

    const eventsResponse = await e2eRequest(app)
      .get('/api/calendar/events')
      .set(e2eAuthHeaders(accessToken, E2E_IDS.orgId))
      .expect(200);

    const holidayEvents = eventsResponse.body.filter(
      (event: { eventTypeId: string }) =>
        event.eventTypeId === holidayType.id,
    );

    expect(holidayEvents.length).toBe(275);
    expect(
      holidayEvents.some((event: { title: string }) => event.title === 'Natal'),
    ).toBe(true);
  });
});
