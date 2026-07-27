import { Inject, Injectable } from '@nestjs/common';
import { EventRepository } from '../repository';
import { FindEventByIdUseCase } from './find-event-by-id.use-case';

@Injectable()
export class DeleteEventUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepository: EventRepository,
    private readonly findEventByIdUseCase: FindEventByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string, userId: string) {
    await this.findEventByIdUseCase.execute(id, organizationId, userId);
    await this.eventRepository.softDelete(id, organizationId, userId);
  }
}
