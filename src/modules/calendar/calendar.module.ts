import { PlatformPermissionGuard } from '@common/guards';
import { MemberModule } from '@modules/member';
import { Module } from '@nestjs/common';
import { EventController } from './event/event.controller';
import { EventRepository } from './event/repository';
import {
  CreateEventUseCase,
  DeleteEventUseCase,
  FindAllEventsUseCase,
  FindEventByIdUseCase,
  UpdateEventUseCase,
} from './event/use-cases';
import { EventTypeController } from './event-type/event-type.controller';
import { EventTypeRepository } from './event-type/repository';
import {
  CreateEventTypeUseCase,
  DeleteEventTypeUseCase,
  FindAllEventTypesUseCase,
  FindEventTypeByIdUseCase,
  UpdateEventTypeUseCase,
} from './event-type/use-cases';

@Module({
  imports: [MemberModule],
  controllers: [EventTypeController, EventController],
  providers: [
    PlatformPermissionGuard,
    EventTypeRepository,
    {
      provide: 'EventTypeRepository',
      useExisting: EventTypeRepository,
    },
    FindAllEventTypesUseCase,
    FindEventTypeByIdUseCase,
    CreateEventTypeUseCase,
    UpdateEventTypeUseCase,
    DeleteEventTypeUseCase,
    EventRepository,
    {
      provide: 'EventRepository',
      useExisting: EventRepository,
    },
    FindAllEventsUseCase,
    FindEventByIdUseCase,
    CreateEventUseCase,
    UpdateEventUseCase,
    DeleteEventUseCase,
  ],
  exports: [
    EventTypeRepository,
    EventRepository,
    FindEventTypeByIdUseCase,
    FindEventByIdUseCase,
  ],
})
export class CalendarModule {}
