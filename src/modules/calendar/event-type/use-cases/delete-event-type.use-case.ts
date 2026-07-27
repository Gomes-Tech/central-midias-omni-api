import { ConflictException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { EventTypeRepository } from '../repository';
import { FindEventTypeByIdUseCase } from './find-event-type-by-id.use-case';

@Injectable()
export class DeleteEventTypeUseCase {
  constructor(
    @Inject('EventTypeRepository')
    private readonly eventTypeRepository: EventTypeRepository,
    private readonly findEventTypeByIdUseCase: FindEventTypeByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string, userId: string) {
    await this.findEventTypeByIdUseCase.execute(id, organizationId);

    const activeEventsCount =
      await this.eventTypeRepository.countActiveEventsByTypeId(
        id,
        organizationId,
      );

    if (activeEventsCount > 0) {
      throw new ConflictException(
        'Não é possível remover o tipo: existem eventos vinculados.',
      );
    }

    await this.eventTypeRepository.softDelete(id, organizationId, userId);
  }
}
