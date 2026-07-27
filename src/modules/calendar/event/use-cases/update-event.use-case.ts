import { BadRequestException } from '@common/filters';
import { FindEventTypeByIdUseCase } from '@modules/calendar/event-type/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateEventDTO } from '../dto';
import { EventRepository } from '../repository';
import { FindEventByIdUseCase } from './find-event-by-id.use-case';

@Injectable()
export class UpdateEventUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepository: EventRepository,
    private readonly findEventByIdUseCase: FindEventByIdUseCase,
    private readonly findEventTypeByIdUseCase: FindEventTypeByIdUseCase,
  ) {}

  async execute(
    id: string,
    organizationId: string,
    data: UpdateEventDTO,
    userId: string,
  ) {
    const existing = await this.findEventByIdUseCase.execute(
      id,
      organizationId,
      userId,
    );

    const startDate = data.startDate ?? existing.startDate;
    const endDate = data.endDate ?? existing.endDate;

    if (endDate < startDate) {
      throw new BadRequestException(
        'A data de término deve ser maior ou igual à data de início',
      );
    }

    if (data.eventTypeId) {
      await this.findEventTypeByIdUseCase.execute(
        data.eventTypeId,
        organizationId,
      );
    }

    if (data.materialIds !== undefined && data.materialIds.length > 0) {
      const materials = await this.eventRepository.findActiveMaterialsInOrg(
        data.materialIds,
        organizationId,
      );

      if (materials.length !== data.materialIds.length) {
        throw new BadRequestException(
          'Um ou mais materiais são inválidos ou não pertencem a esta organização',
        );
      }
    }

    await this.eventRepository.update(id, organizationId, data, userId);
  }
}
