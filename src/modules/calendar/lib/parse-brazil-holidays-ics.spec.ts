import * as fs from 'node:fs';
import * as path from 'node:path';

const {
  convertAllDayDates,
  ensureHolidayEventType,
  getBrazilianHolidayEvents,
  parseBrazilianHolidaysIcs,
  seedHolidaysForOrganization,
} = require('../../../../prisma/lib/brazilian-holidays');

const SAMPLE_ICS = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20220301
DTEND;VALUE=DATE:20220302
UID:test-uid-1@google.com
DESCRIPTION:Feriado
SUMMARY:Carnaval (Terça-feira)
END:VEVENT
BEGIN:VEVENT
DTSTART;VALUE=DATE:20220814
DTEND;VALUE=DATE:20220815
UID:test-uid-2@google.com
DESCRIPTION:Data comemorativa\\nPara ocultar as datas comemorativas\\, acesse
 Configurações do Google Agenda > Feriados no Brasil
SUMMARY:Dia dos Pais
END:VEVENT
END:VCALENDAR`;

describe('parseBrazilianHolidaysIcs', () => {
  it('deve parsear eventos com datas all-day e descrições normalizadas', () => {
    const events = parseBrazilianHolidaysIcs(SAMPLE_ICS);

    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      uid: 'test-uid-1@google.com',
      title: 'Carnaval (Terça-feira)',
      description: 'Feriado',
    });
    expect(events[0].startDate.toISOString()).toBe('2022-03-01T03:00:00.000Z');
    expect(events[0].endDate.toISOString()).toBe('2022-03-02T02:59:59.000Z');

    expect(events[1]).toMatchObject({
      uid: 'test-uid-2@google.com',
      title: 'Dia dos Pais',
      description: 'Data comemorativa',
    });
  });

  it('deve carregar 275 eventos do arquivo ICS do repositório', () => {
    const events = getBrazilianHolidayEvents();

    expect(events).toHaveLength(275);
    expect(events.some((event: { title: string }) => event.title === 'Natal')).toBe(
      true,
    );
  });

  it('deve converter DTEND exclusivo para o fim do dia anterior em BRT', () => {
    const { startDate, endDate } = convertAllDayDates('20250101', '20250102');

    expect(startDate.toISOString()).toBe('2025-01-01T03:00:00.000Z');
    expect(endDate.toISOString()).toBe('2025-01-02T02:59:59.000Z');
  });
});

describe('brazilian-holidays seed', () => {
  it('ensureHolidayEventType deve reutilizar tipo existente com name case-insensitive', async () => {
    const tx = {
      calendarEventType: {
        findFirst: jest.fn().mockResolvedValue({ id: 'type-existing' }),
        create: jest.fn(),
      },
    };

    const result = await ensureHolidayEventType(tx, 'org-1');

    expect(result).toEqual({ id: 'type-existing', created: false });
    expect(tx.calendarEventType.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        isDeleted: false,
        name: { equals: 'feriado', mode: 'insensitive' },
      },
      select: { id: true },
    });
    expect(tx.calendarEventType.create).not.toHaveBeenCalled();
  });

  it('ensureHolidayEventType deve criar tipo quando não existir', async () => {
    const tx = {
      calendarEventType: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'type-new' }),
      },
    };

    const result = await ensureHolidayEventType(tx, 'org-1');

    expect(result).toEqual({ id: 'type-new', created: true });
    expect(tx.calendarEventType.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          name: 'Feriado',
          slug: 'feriado',
          color: '#DC2626',
        }),
      }),
    );
  });

  it('seedHolidaysForOrganization deve ser idempotente e retornar contadores', async () => {
    const holidays = parseBrazilianHolidaysIcs(SAMPLE_ICS);

    const existingEvents = [
      {
        id: 'event-existing-1',
        title: holidays[0].title,
        startDate: holidays[0].startDate,
        endDate: holidays[0].endDate,
      },
    ];

    const tx = {
      calendarEventType: {
        findFirst: jest.fn().mockResolvedValue({ id: 'type-1' }),
        create: jest.fn(),
      },
      calendarEvent: {
        findMany: jest.fn().mockResolvedValue(existingEvents),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };

    const result = await seedHolidaysForOrganization(
      tx,
      'org-1',
      'user-1',
      holidays,
    );

    expect(result).toEqual({
      eventTypeId: 'type-1',
      eventTypeCreated: false,
      created: 1,
      updated: 0,
      skipped: 1,
    });

    expect(tx.calendarEvent.createMany).toHaveBeenCalledTimes(1);
    expect(tx.calendarEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          organizationId: 'org-1',
          eventTypeId: 'type-1',
          title: 'Dia dos Pais',
          createdByUserId: 'user-1',
        }),
      ]),
    });
  });
});

describe('brazil-holidays.ics fixture', () => {
  it('deve existir no caminho esperado pelo seed', () => {
    const icsPath = path.join(
      __dirname,
      '../../../../prisma/data/brazil-holidays.ics',
    );

    expect(fs.existsSync(icsPath)).toBe(true);
  });
});
