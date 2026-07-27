import { NotFoundException } from '@common/filters';
import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { EventRepository } from '../repository';
import { FindEventByIdUseCase } from './find-event-by-id.use-case';
import { makeEventEntity, makeMemberRole } from './test-helpers';

describe('FindEventByIdUseCase', () => {
  let eventRepository: jest.Mocked<
    Pick<EventRepository, 'findById' | 'isVisibleToPortalUser'>
  >;
  let findMemberRoleUseCase: jest.Mocked<Pick<FindMemberRoleUseCase, 'execute'>>;
  let useCase: FindEventByIdUseCase;

  beforeEach(() => {
    eventRepository = {
      findById: jest.fn(),
      isVisibleToPortalUser: jest.fn(),
    };

    findMemberRoleUseCase = {
      execute: jest.fn(),
    };

    useCase = new FindEventByIdUseCase(
      eventRepository as unknown as EventRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
    );
  });

  it('deve retornar 404 quando evento não for visível no portal', async () => {
    findMemberRoleUseCase.execute.mockResolvedValue(
      makeMemberRole({
        canAccessBackoffice: false,
        roleId: 'role-portal',
      }),
    );
    eventRepository.isVisibleToPortalUser.mockResolvedValue(false);

    await expect(
      useCase.execute('event-1', 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve retornar evento sem materiais para usuário sem backoffice', async () => {
    const event = makeEventEntity({ materials: [] });
    findMemberRoleUseCase.execute.mockResolvedValue(
      makeMemberRole({ canAccessBackoffice: false, roleId: 'role-portal' }),
    );
    eventRepository.isVisibleToPortalUser.mockResolvedValue(true);
    eventRepository.findById.mockResolvedValue(event);

    await expect(
      useCase.execute('event-1', 'org-1', 'user-1'),
    ).resolves.toBe(event);
  });
});
