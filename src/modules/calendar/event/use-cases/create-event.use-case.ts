import { BadRequestException } from '@common/filters';
import { FindEventTypeByIdUseCase } from '@modules/calendar/event-type/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { CreateEventDTO } from '../dto';
import { EventRepository } from '../repository';

@Injectable()
export class CreateEventUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepository: EventRepository,
    private readonly findEventTypeByIdUseCase: FindEventTypeByIdUseCase,
  ) {}

  async execute(
    organizationId: string,
    data: CreateEventDTO,
    userId: string,
  ) {
    if (data.endDate < data.startDate) {
      throw new BadRequestException(
        'A data de término deve ser maior ou igual à data de início',
      );
    }

    await this.findEventTypeByIdUseCase.execute(
      data.eventTypeId,
      organizationId,
    );

    const materialIds = data.materialIds ?? [];

    if (materialIds.length > 0) {
      const materials = await this.eventRepository.findActiveMaterialsInOrg(
        materialIds,
        organizationId,
      );

      if (materials.length !== materialIds.length) {
        throw new BadRequestException(
          'Um ou mais materiais são inválidos ou não pertencem a esta organização',
        );
      }
    }

    return await this.eventRepository.create(organizationId, data, userId);
  }
}
