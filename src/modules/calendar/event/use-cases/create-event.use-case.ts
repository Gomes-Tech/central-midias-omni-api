import { BadRequestException } from '@common/filters';
import { FindEventTypeByIdUseCase } from '@modules/calendar/event-type/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { CreateEventDTO } from '../dto';
import { EventRepository } from '../repository';

const BRAZIL_TIME_ZONE = 'America/Sao_Paulo';

function toCalendarDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

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
    if (toCalendarDateKey(data.startDate) < toCalendarDateKey(new Date())) {
      throw new BadRequestException(
        'Não é possível criar eventos em dias anteriores à data atual',
      );
    }

    if (data.endDate <= data.startDate) {
      throw new BadRequestException(
        'O término deve ser depois do início. No mesmo dia, o horário de fim deve ser maior que o de início',
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
