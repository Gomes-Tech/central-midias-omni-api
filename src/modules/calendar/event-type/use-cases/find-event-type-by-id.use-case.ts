import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { EventTypeRepository } from '../repository';

@Injectable()
export class FindEventTypeByIdUseCase {
  constructor(
    @Inject('EventTypeRepository')
    private readonly eventTypeRepository: EventTypeRepository,
  ) {}

  async execute(id: string, organizationId: string) {
    const eventType = await this.eventTypeRepository.findById(
      id,
      organizationId,
    );

    if (!eventType) {
      throw new NotFoundException('Tipo de evento não encontrado');
    }

    return eventType;
  }
}
