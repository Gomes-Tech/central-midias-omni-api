import { ConflictException } from '@common/filters';
import { toSlug } from '@common/utils';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateEventTypeDTO } from '../dto';
import { EventTypeRepository } from '../repository';
import { FindEventTypeByIdUseCase } from './find-event-type-by-id.use-case';

@Injectable()
export class UpdateEventTypeUseCase {
  constructor(
    @Inject('EventTypeRepository')
    private readonly eventTypeRepository: EventTypeRepository,
    private readonly findEventTypeByIdUseCase: FindEventTypeByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateEventTypeDTO,
    userId: string,
  ) {
    await this.findEventTypeByIdUseCase.execute(id, organizationId);

    let slug: string | undefined;

    if (data.slug !== undefined) {
      slug = data.slug.trim() ? toSlug(data.slug) : undefined;
    } else if (data.name !== undefined) {
      slug = toSlug(data.name);
    }

    if (slug) {
      const existing = await this.eventTypeRepository.findBySlug(
        slug,
        organizationId,
        id,
      );

      if (existing) {
        throw new ConflictException(
          'Já existe um tipo de evento com este slug nesta organização',
        );
      }
    }

    await this.eventTypeRepository.update(
      id,
      organizationId,
      { ...data, ...(slug !== undefined && { slug }) },
      userId,
    );
  }
}
