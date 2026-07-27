import { PlatformPermissionGuard } from '@common/guards';
import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import {
  CreateEventUseCase,
  DeleteEventUseCase,
  FindAllEventsUseCase,
  FindEventByIdUseCase,
  UpdateEventUseCase,
} from './use-cases';

describe('EventController', () => {
  let controller: EventController;
  let createEventUseCase: { execute: jest.Mock };
  let findAllEventsUseCase: { execute: jest.Mock };
  let findEventByIdUseCase: { execute: jest.Mock };
  let updateEventUseCase: { execute: jest.Mock };
  let deleteEventUseCase: { execute: jest.Mock };

  beforeEach(async () => {
    createEventUseCase = { execute: jest.fn() };
    findAllEventsUseCase = { execute: jest.fn() };
    findEventByIdUseCase = { execute: jest.fn() };
    updateEventUseCase = { execute: jest.fn() };
    deleteEventUseCase = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: CreateEventUseCase, useValue: createEventUseCase },
        { provide: FindAllEventsUseCase, useValue: findAllEventsUseCase },
        { provide: FindEventByIdUseCase, useValue: findEventByIdUseCase },
        { provide: UpdateEventUseCase, useValue: updateEventUseCase },
        { provide: DeleteEventUseCase, useValue: deleteEventUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate: jest.fn().mockResolvedValue(true) })
      .compile();

    controller = module.get<EventController>(EventController);
  });

  it('deve listar eventos com organizationId e userId', async () => {
    findAllEventsUseCase.execute.mockResolvedValue([]);

    await controller.findAll('org-1', 'user-1', { isActive: true });

    expect(findAllEventsUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      'user-1',
      { isActive: true },
    );
  });

  it('deve buscar evento por id', async () => {
    findEventByIdUseCase.execute.mockResolvedValue({ id: 'event-1' });

    await controller.findById('event-1', 'org-1', 'user-1');

    expect(findEventByIdUseCase.execute).toHaveBeenCalledWith(
      'event-1',
      'org-1',
      'user-1',
    );
  });
});
