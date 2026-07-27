import { ConflictException } from '@common/filters';
import { EventTypeRepository } from '../repository';
import { FindEventTypeByIdUseCase } from './find-event-type-by-id.use-case';
import { makeEventTypeEntity, makeUpdateEventTypeDTO } from './test-helpers';
import { UpdateEventTypeUseCase } from './update-event-type.use-case';

describe('UpdateEventTypeUseCase', () => {
  let eventTypeRepository: jest.Mocked<
    Pick<EventTypeRepository, 'findBySlug' | 'update'>
  >;
  let findEventTypeByIdUseCase: jest.Mocked<
    Pick<FindEventTypeByIdUseCase, 'execute'>
  >;
  let useCase: UpdateEventTypeUseCase;

  beforeEach(() => {
    eventTypeRepository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
    };

    findEventTypeByIdUseCase = {
      execute: jest.fn().mockResolvedValue(makeEventTypeEntity()),
    };

    useCase = new UpdateEventTypeUseCase(
      eventTypeRepository as unknown as EventTypeRepository,
      findEventTypeByIdUseCase as unknown as FindEventTypeByIdUseCase,
    );
  });

  it('deve atualizar gerando slug a partir do name', async () => {
    const dto = makeUpdateEventTypeDTO({ name: 'Tema Especial' });

    await useCase.execute('type-1', 'org-1', dto, 'user-1');

    expect(eventTypeRepository.update).toHaveBeenCalledWith(
      'type-1',
      'org-1',
      expect.objectContaining({ slug: 'tema-especial' }),
      'user-1',
    );
  });

  it('deve lançar Conflict quando novo slug já existir', async () => {
    eventTypeRepository.findBySlug.mockResolvedValue(
      makeEventTypeEntity({ id: 'other-type' }),
    );

    await expect(
      useCase.execute(
        'type-1',
        'org-1',
        makeUpdateEventTypeDTO({ slug: 'feriado' }),
        'user-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
