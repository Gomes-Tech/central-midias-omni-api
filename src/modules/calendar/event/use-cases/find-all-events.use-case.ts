import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { FindAllEventsFiltersDTO } from '../dto';
import { EventRepository } from '../repository';

@Injectable()
export class FindAllEventsUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepository: EventRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
  ) {}

  async execute(
    organizationId: string,
    userId: string,
    filters: FindAllEventsFiltersDTO = {},
  ) {
    const memberRole = await this.findMemberRoleUseCase.execute(
      organizationId,
      userId,
    );

    const visibility = memberRole.canAccessBackoffice
      ? undefined
      : {
          canAccessBackoffice: false,
          roleId: memberRole.roleId,
        };

    return await this.eventRepository.findAll(
      organizationId,
      filters,
      visibility,
    );
  }
}
