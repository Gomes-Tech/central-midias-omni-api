import { ConflictException, NotFoundException } from '@common/filters';
import { EventTypeRepository } from '../repository';
import { DeleteEventTypeUseCase } from './delete-event-type.use-case';
import { FindEventTypeByIdUseCase } from './find-event-type-by-id.use-case';
import { makeEventTypeEntity } from './test-helpers';

describe('DeleteEventTypeUseCase', () => {
  let eventTypeRepository: jest.Mocked<
    Pick<EventTypeRepository, 'countActiveEventsByTypeId' | 'softDelete'>
  >;
  let findEventTypeByIdUseCase: jest.Mocked<
    Pick<FindEventTypeByIdUseCase, 'execute'>
  >;
  let useCase: DeleteEventTypeUseCase;

  beforeEach(() => {
    eventTypeRepository = {
      countActiveEventsByTypeId: jest.fn().mockResolvedValue(0),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    findEventTypeByIdUseCase = {
      execute: jest.fn().mockResolvedValue(makeEventTypeEntity()),
    };

    useCase = new DeleteEventTypeUseCase(
      eventTypeRepository as unknown as EventTypeRepository,
      findEventTypeByIdUseCase as unknown as FindEventTypeByIdUseCase,
    );
  });

  it('deve soft delete quando não houver eventos ativos vinculados', async () => {
    await useCase.execute('type-1', 'org-1', 'user-1');

    expect(eventTypeRepository.softDelete).toHaveBeenCalledWith(
      'type-1',
      'org-1',
      'user-1',
    );
  });

  it('deve lançar Conflict 409 quando houver eventos ativos vinculados', async () => {
    eventTypeRepository.countActiveEventsByTypeId.mockResolvedValue(2);

    await expect(
      useCase.execute('type-1', 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(eventTypeRepository.softDelete).not.toHaveBeenCalled();
  });

  it('deve propagar NotFound quando tipo não existir', async () => {
    findEventTypeByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Tipo de evento não encontrado'),
    );

    await expect(
      useCase.execute('missing', 'org-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
