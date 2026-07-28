const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const HOLIDAY_EVENT_TYPE_NAME = 'Feriado';
const HOLIDAY_EVENT_TYPE_SLUG = 'feriado';
const HOLIDAY_EVENT_TYPE_COLOR = '#DC2626';
const HOLIDAY_EVENT_TYPE_DESCRIPTION = 'Feriados nacionais e regionais';
const BATCH_SIZE = 100;
/** Offset fixo de Brasília (sem horário de verão desde 2019). */
const BRAZIL_UTC_OFFSET = '-03:00';

const ICS_FILE_PATH = path.join(__dirname, '..', 'data', 'brazil-holidays.ics');

/** @type {import('./brazilian-holidays.types').ParsedHolidayEvent[] | null} */
let cachedHolidayEvents = null;

/**
 * @param {string} content
 * @returns {import('./brazilian-holidays.types').ParsedHolidayEvent[]}
 */
function parseBrazilianHolidaysIcs(content) {
  const unfolded = unfoldIcsLines(content);
  const events = [];
  const veventBlocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];

  for (const block of veventBlocks) {
    const uid = extractIcsField(block, 'UID');
    const summary = extractIcsField(block, 'SUMMARY');
    const descriptionRaw = extractIcsField(block, 'DESCRIPTION');
    const dtStart = extractIcsDateField(block, 'DTSTART');
    const dtEnd = extractIcsDateField(block, 'DTEND');

    if (!uid || !summary || !dtStart || !dtEnd) {
      continue;
    }

    const description = normalizeDescription(descriptionRaw);
    const { startDate, endDate } = convertAllDayDates(dtStart, dtEnd);

    events.push({
      uid,
      title: summary,
      description,
      startDate,
      endDate,
    });
  }

  return events;
}

/**
 * @param {string} content
 * @returns {string}
 */
function unfoldIcsLines(content) {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const unfolded = [];

  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
      continue;
    }

    unfolded.push(line);
  }

  return unfolded.join('\n');
}

/**
 * @param {string} block
 * @param {string} fieldName
 * @returns {string | null}
 */
function extractIcsField(block, fieldName) {
  const regex = new RegExp(`^${fieldName}(?:;[^:]*)?:(.*)$`, 'm');
  const match = block.match(regex);

  if (!match) {
    return null;
  }

  return unescapeIcsText(match[1].trim());
}

/**
 * @param {string} block
 * @param {string} fieldName
 * @returns {string | null}
 */
function extractIcsDateField(block, fieldName) {
  const regex = new RegExp(`^${fieldName};VALUE=DATE:(\\d{8})$`, 'm');
  const match = block.match(regex);

  return match ? match[1] : null;
}

/**
 * @param {string | null} value
 * @returns {string}
 */
function normalizeDescription(value) {
  if (!value) {
    return HOLIDAY_EVENT_TYPE_DESCRIPTION;
  }

  const firstLine = value.split(/\r?\n/)[0]?.trim();

  return firstLine || HOLIDAY_EVENT_TYPE_DESCRIPTION;
}

/**
 * @param {string} value
 * @returns {string}
 */
function unescapeIcsText(value) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * @param {string} dateValue - YYYYMMDD
 * @returns {{ year: string; month: string; day: string }}
 */
function splitIcsDate(dateValue) {
  return {
    year: dateValue.slice(0, 4),
    month: dateValue.slice(4, 6),
    day: dateValue.slice(6, 8),
  };
}

/**
 * Início do dia civil em America/Sao_Paulo.
 * @param {string} dateValue - YYYYMMDD
 * @returns {Date}
 */
function parseIcsDateStart(dateValue) {
  const { year, month, day } = splitIcsDate(dateValue);
  return new Date(`${year}-${month}-${day}T00:00:00${BRAZIL_UTC_OFFSET}`);
}

/**
 * DTEND all-day do ICS é exclusivo; converte para 23:59:59 do último dia incluso (BRT).
 * @param {string} exclusiveEndDateValue - YYYYMMDD (ICS exclusive end)
 * @returns {Date}
 */
function parseIcsDateEndExclusive(exclusiveEndDateValue) {
  const { year, month, day } = splitIcsDate(exclusiveEndDateValue);
  // Meio-dia UTC só para aritmética de calendário, sem efeito de fuso.
  const cursor = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0),
  );
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  const lastYear = String(cursor.getUTCFullYear());
  const lastMonth = String(cursor.getUTCMonth() + 1).padStart(2, '0');
  const lastDay = String(cursor.getUTCDate()).padStart(2, '0');

  return new Date(
    `${lastYear}-${lastMonth}-${lastDay}T23:59:59${BRAZIL_UTC_OFFSET}`,
  );
}

/**
 * @param {string} dtStart
 * @param {string} dtEnd
 * @returns {{ startDate: Date; endDate: Date }}
 */
function convertAllDayDates(dtStart, dtEnd) {
  return {
    startDate: parseIcsDateStart(dtStart),
    endDate: parseIcsDateEndExclusive(dtEnd),
  };
}

/**
 * @returns {import('./brazilian-holidays.types').ParsedHolidayEvent[]}
 */
function getBrazilianHolidayEvents() {
  if (cachedHolidayEvents) {
    return cachedHolidayEvents;
  }

  const content = fs.readFileSync(ICS_FILE_PATH, 'utf8');
  cachedHolidayEvents = parseBrazilianHolidaysIcs(content);

  return cachedHolidayEvents;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} organizationId
 * @returns {Promise<{ id: string; created: boolean }>}
 */
async function ensureHolidayEventType(tx, organizationId) {
  const existing = await tx.calendarEventType.findFirst({
    where: {
      organizationId,
      isDeleted: false,
      name: {
        equals: 'feriado',
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    return { id: existing.id, created: false };
  }

  const created = await tx.calendarEventType.create({
    data: {
      id: randomUUID(),
      organizationId,
      name: HOLIDAY_EVENT_TYPE_NAME,
      slug: HOLIDAY_EVENT_TYPE_SLUG,
      color: HOLIDAY_EVENT_TYPE_COLOR,
      description: HOLIDAY_EVENT_TYPE_DESCRIPTION,
      order: 0,
      isActive: true,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  return { id: created.id, created: true };
}

/**
 * Chave estável por título + dia civil do ICS (YYYY-MM-DD).
 * @param {string} title
 * @param {Date} startDate
 * @returns {string}
 */
function toEventKey(title, startDate) {
  return `${title}|${startDate.toISOString().slice(0, 10)}`;
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} tx
 * @param {string} organizationId
 * @param {string} createdByUserId
 * @param {import('./brazilian-holidays.types').ParsedHolidayEvent[] | null} [holidaysOverride]
 * @returns {Promise<{ eventTypeId: string; eventTypeCreated: boolean; created: number; updated: number; skipped: number }>}
 */
async function seedHolidaysForOrganization(
  tx,
  organizationId,
  createdByUserId,
  holidaysOverride = null,
) {
  const { id: eventTypeId, created: eventTypeCreated } =
    await ensureHolidayEventType(tx, organizationId);

  const holidays = holidaysOverride ?? getBrazilianHolidayEvents();

  const existingEvents = await tx.calendarEvent.findMany({
    where: {
      organizationId,
      eventTypeId,
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      startDate: true,
      endDate: true,
    },
  });

  const existingByKey = new Map(
    existingEvents.map((event) => [
      toEventKey(event.title, event.startDate),
      event,
    ]),
  );

  /** @type {import('./brazilian-holidays.types').ParsedHolidayEvent[]} */
  const eventsToCreate = [];
  let updated = 0;
  let skipped = 0;

  for (const holiday of holidays) {
    const key = toEventKey(holiday.title, holiday.startDate);
    const existing = existingByKey.get(key);

    if (!existing) {
      eventsToCreate.push(holiday);
      continue;
    }

    const sameStart =
      existing.startDate.getTime() === holiday.startDate.getTime();
    const sameEnd = existing.endDate.getTime() === holiday.endDate.getTime();

    if (sameStart && sameEnd) {
      skipped += 1;
      continue;
    }

    await tx.calendarEvent.update({
      where: { id: existing.id },
      data: {
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        description: holiday.description,
      },
    });
    updated += 1;
  }

  let created = 0;

  for (let index = 0; index < eventsToCreate.length; index += BATCH_SIZE) {
    const batch = eventsToCreate.slice(index, index + BATCH_SIZE);

    const result = await tx.calendarEvent.createMany({
      data: batch.map((holiday) => ({
        id: randomUUID(),
        organizationId,
        eventTypeId,
        title: holiday.title,
        description: holiday.description,
        startDate: holiday.startDate,
        endDate: holiday.endDate,
        createdByUserId,
        isActive: true,
        isDeleted: false,
      })),
    });

    created += result.count;
  }

  return {
    eventTypeId,
    eventTypeCreated,
    created,
    updated,
    skipped,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<string>}
 */
async function resolveSeedUserId(prisma) {
  const adminUser = await prisma.user.findFirst({
    where: {
      email: 'admin@admin.com',
      isDeleted: false,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (adminUser) {
    return adminUser.id;
  }

  const fallbackUser = await prisma.user.findFirst({
    where: {
      isDeleted: false,
      isActive: true,
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!fallbackUser) {
    throw new Error(
      'Nenhum usuário ativo encontrado para atribuir como autor dos feriados.',
    );
  }

  return fallbackUser.id;
}

module.exports = {
  BATCH_SIZE,
  BRAZIL_UTC_OFFSET,
  HOLIDAY_EVENT_TYPE_NAME,
  HOLIDAY_EVENT_TYPE_SLUG,
  convertAllDayDates,
  ensureHolidayEventType,
  getBrazilianHolidayEvents,
  parseBrazilianHolidaysIcs,
  parseIcsDateEndExclusive,
  parseIcsDateStart,
  resolveSeedUserId,
  seedHolidaysForOrganization,
};
