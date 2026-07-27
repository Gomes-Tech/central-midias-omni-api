import { ConflictException, NotFoundException } from '@common/filters';
import { toSlug } from '@common/utils';
import { Inject, Injectable } from '@nestjs/common';
import { CreateEventTypeDTO } from '../dto';
import { EventTypeRepository } from '../repository';

@Injectable()
export class CreateEventTypeUseCase {
  constructor(
    @Inject('EventTypeRepository')
    private readonly eventTypeRepository: EventTypeRepository,
  ) {}

  async execute(
    organizationId: string,
    data: CreateEventTypeDTO,
    userId: string,
  ) {
    const slug = data.slug?.trim() ? toSlug(data.slug) : toSlug(data.name);

    const existing = await this.eventTypeRepository.findBySlug(
      slug,
      organizationId,
    );

    if (existing) {
      throw new ConflictException(
        'Já existe um tipo de evento com este slug nesta organização',
      );
    }

    return await this.eventTypeRepository.create(
      organizationId,
      { ...data, slug },
      userId,
    );
  }
}
