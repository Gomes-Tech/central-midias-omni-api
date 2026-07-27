import { FindMemberRoleUseCase } from '@modules/member/use-cases';
import { EventRepository } from '../repository';
import { FindAllEventsUseCase } from './find-all-events.use-case';
import { makeEventEntity, makeMemberRole } from './test-helpers';

describe('FindAllEventsUseCase', () => {
  let eventRepository: jest.Mocked<Pick<EventRepository, 'findAll'>>;
  let findMemberRoleUseCase: jest.Mocked<Pick<FindMemberRoleUseCase, 'execute'>>;
  let useCase: FindAllEventsUseCase;

  beforeEach(() => {
    eventRepository = {
      findAll: jest.fn().mockResolvedValue([makeEventEntity()]),
    };

    findMemberRoleUseCase = {
      execute: jest.fn(),
    };

    useCase = new FindAllEventsUseCase(
      eventRepository as unknown as EventRepository,
      findMemberRoleUseCase as unknown as FindMemberRoleUseCase,
    );
  });

  it('deve listar todos quando canAccessBackoffice=true', async () => {
    findMemberRoleUseCase.execute.mockResolvedValue(
      makeMemberRole({ canAccessBackoffice: true, roleId: 'role-admin' }),
    );

    await useCase.execute('org-1', 'user-1', { isActive: true });

    expect(eventRepository.findAll).toHaveBeenCalledWith(
      'org-1',
      { isActive: true },
      undefined,
    );
  });

  it('deve filtrar por roleId quando sem backoffice', async () => {
    findMemberRoleUseCase.execute.mockResolvedValue(
      makeMemberRole({
        canAccessBackoffice: false,
        roleId: 'role-portal',
        categoryRoleAccesses: [{ categoryId: 'cat-a' }, { categoryId: 'cat-b' }],
      }),
    );

    await useCase.execute('org-1', 'user-1');

    expect(eventRepository.findAll).toHaveBeenCalledWith(
      'org-1',
      {},
      {
        canAccessBackoffice: false,
        roleId: 'role-portal',
      },
    );
  });
});
