import { Inject, Injectable } from '@nestjs/common';
import { FindAllEventTypesFiltersDTO } from '../dto';
import { EventTypeRepository } from '../repository';

@Injectable()
export class FindAllEventTypesUseCase {
  constructor(
    @Inject('EventTypeRepository')
    private readonly eventTypeRepository: EventTypeRepository,
  ) {}

  async execute(
    organizationId: string,
    filters: FindAllEventTypesFiltersDTO = {},
  ) {
    return await this.eventTypeRepository.findAll(organizationId, filters);
  }
}
