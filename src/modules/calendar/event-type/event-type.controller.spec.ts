import { PlatformPermissionGuard } from '@common/guards';
import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventTypeController } from './event-type.controller';
import {
  CreateEventTypeUseCase,
  DeleteEventTypeUseCase,
  FindAllEventTypesUseCase,
  FindEventTypeByIdUseCase,
  UpdateEventTypeUseCase,
} from './use-cases';

describe('EventTypeController', () => {
  let controller: EventTypeController;
  let createEventTypeUseCase: { execute: jest.Mock };
  let findAllEventTypesUseCase: { execute: jest.Mock };
  let findEventTypeByIdUseCase: { execute: jest.Mock };
  let updateEventTypeUseCase: { execute: jest.Mock };
  let deleteEventTypeUseCase: { execute: jest.Mock };
  let canActivate: jest.Mock;

  beforeEach(async () => {
    createEventTypeUseCase = { execute: jest.fn() };
    findAllEventTypesUseCase = { execute: jest.fn() };
    findEventTypeByIdUseCase = { execute: jest.fn() };
    updateEventTypeUseCase = { execute: jest.fn() };
    deleteEventTypeUseCase = { execute: jest.fn() };
    canActivate = jest.fn().mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventTypeController],
      providers: [
        { provide: CreateEventTypeUseCase, useValue: createEventTypeUseCase },
        {
          provide: FindAllEventTypesUseCase,
          useValue: findAllEventTypesUseCase,
        },
        {
          provide: FindEventTypeByIdUseCase,
          useValue: findEventTypeByIdUseCase,
        },
        { provide: UpdateEventTypeUseCase, useValue: updateEventTypeUseCase },
        { provide: DeleteEventTypeUseCase, useValue: deleteEventTypeUseCase },
      ],
    })
      .overrideGuard(PlatformPermissionGuard)
      .useValue({ canActivate })
      .compile();

    controller = module.get<EventTypeController>(EventTypeController);
  });

  it('deve listar tipos sem exigir PlatformPermissionGuard no GET', async () => {
    findAllEventTypesUseCase.execute.mockResolvedValue([]);

    await controller.findAll('org-1', { isActive: true });

    expect(findAllEventTypesUseCase.execute).toHaveBeenCalledWith('org-1', {
      isActive: true,
    });
  });

  it('deve criar tipo com permissão', async () => {
    const dto = {
      name: 'Feriado',
      color: '#DC2626',
    };
    createEventTypeUseCase.execute.mockResolvedValue({ id: 'type-1' });

    await controller.create(dto, 'org-1', 'user-1');

    expect(createEventTypeUseCase.execute).toHaveBeenCalledWith(
      'org-1',
      dto,
      'user-1',
    );
  });

  it('deve bloquear create quando PlatformPermissionGuard negar (403)', async () => {
    canActivate.mockRejectedValue(new ForbiddenException('Acesso negado'));

    const guard = new (class {
      canActivate = canActivate;
    })();

    await expect(guard.canActivate()).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
