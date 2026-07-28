import { BadRequestException } from '@common/filters';
import { FindEventTypeByIdUseCase } from '@modules/calendar/event-type/use-cases';
import { EventRepository } from '../repository';
import { CreateEventUseCase } from './create-event.use-case';
import { makeCreateEventDTO, makeEventEntity } from './test-helpers';

describe('CreateEventUseCase', () => {
  let eventRepository: jest.Mocked<
    Pick<EventRepository, 'create' | 'findActiveMaterialsInOrg'>
  >;
  let findEventTypeByIdUseCase: jest.Mocked<
    Pick<FindEventTypeByIdUseCase, 'execute'>
  >;
  let useCase: CreateEventUseCase;

  beforeEach(() => {
    eventRepository = {
      create: jest.fn().mockResolvedValue(makeEventEntity()),
      findActiveMaterialsInOrg: jest.fn().mockResolvedValue([{ id: 'mat-1' }]),
    };

    findEventTypeByIdUseCase = {
      execute: jest.fn().mockResolvedValue({ id: 'event-type-1' }),
    };

    useCase = new CreateEventUseCase(
      eventRepository as unknown as EventRepository,
      findEventTypeByIdUseCase as unknown as FindEventTypeByIdUseCase,
    );
  });

  it('deve criar evento válido', async () => {
    const dto = makeCreateEventDTO();

    await useCase.execute('org-1', dto, 'user-1');

    expect(eventRepository.create).toHaveBeenCalledWith(
      'org-1',
      dto,
      'user-1',
    );
  });

  it('deve lançar BadRequest quando startDate for em dia anterior a hoje', async () => {
    const dto = makeCreateEventDTO({
      startDate: new Date('2020-01-01T12:00:00.000Z'),
      endDate: new Date('2020-01-01T13:00:00.000Z'),
    });

    await expect(
      useCase.execute('org-1', dto, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando endDate < startDate', async () => {
    const dto = makeCreateEventDTO({
      startDate: new Date('2026-08-10T00:00:00.000Z'),
      endDate: new Date('2026-08-01T00:00:00.000Z'),
    });

    await expect(
      useCase.execute('org-1', dto, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando endDate for igual a startDate', async () => {
    const sameInstant = new Date('2026-08-10T10:00:00.000Z');
    const dto = makeCreateEventDTO({
      startDate: sameInstant,
      endDate: sameInstant,
    });

    await expect(
      useCase.execute('org-1', dto, 'user-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(eventRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar evento no mesmo dia com horário de fim maior', async () => {
    const dto = makeCreateEventDTO({
      startDate: new Date('2026-08-10T10:00:00.000Z'),
      endDate: new Date('2026-08-10T11:00:00.000Z'),
    });

    await useCase.execute('org-1', dto, 'user-1');

    expect(eventRepository.create).toHaveBeenCalledWith(
      'org-1',
      dto,
      'user-1',
    );
  });

  it('deve lançar BadRequest quando materialId for inválido', async () => {
    eventRepository.findActiveMaterialsInOrg.mockResolvedValue([]);

    await expect(
      useCase.execute(
        'org-1',
        makeCreateEventDTO({ materialIds: ['other-org-mat'] }),
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
