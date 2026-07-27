import { NotFoundException } from '@common/filters';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { Inject, Injectable } from '@nestjs/common';
import { EventRepository } from '../repository';

@Injectable()
export class FindEventByIdUseCase {
  constructor(
    @Inject('EventRepository')
    private readonly eventRepository: EventRepository,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
  ) {}

  async execute(id: string, organizationId: string, userId: string) {
    const memberRole = await this.findMemberRoleUseCase.execute(
      organizationId,
      userId,
    );

    if (!memberRole.canAccessBackoffice) {
      const isVisible = await this.eventRepository.isVisibleToPortalUser(
        id,
        organizationId,
        memberRole.roleId,
      );

      if (!isVisible) {
        throw new NotFoundException('Evento não encontrado');
      }
    }

    const event = await this.eventRepository.findById(
      id,
      organizationId,
      memberRole.canAccessBackoffice ? undefined : memberRole.roleId,
    );

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    return event;
  }
}
