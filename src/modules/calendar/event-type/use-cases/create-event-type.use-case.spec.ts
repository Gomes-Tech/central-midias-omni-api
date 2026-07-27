import { ConflictException } from '@common/filters';
import { EventTypeRepository } from '../repository';
import { CreateEventTypeUseCase } from './create-event-type.use-case';
import {
  makeCreateEventTypeDTO,
  makeEventTypeEntity,
} from './test-helpers';

describe('CreateEventTypeUseCase', () => {
  let eventTypeRepository: jest.Mocked<
    Pick<EventTypeRepository, 'findBySlug' | 'create'>
  >;
  let useCase: CreateEventTypeUseCase;

  beforeEach(() => {
    eventTypeRepository = {
      findBySlug: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(makeEventTypeEntity()),
    };

    useCase = new CreateEventTypeUseCase(
      eventTypeRepository as unknown as EventTypeRepository,
    );
  });

  it('deve gerar slug a partir do name quando slug for omitido', async () => {
    const dto = makeCreateEventTypeDTO({ name: 'Dia das Mães' });

    await useCase.execute('org-1', dto, 'user-1');

    expect(eventTypeRepository.findBySlug).toHaveBeenCalledWith(
      'dia-das-maes',
      'org-1',
    );
    expect(eventTypeRepository.create).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ slug: 'dia-das-maes' }),
      'user-1',
    );
  });

  it('deve usar slug informado quando presente', async () => {
    const dto = makeCreateEventTypeDTO({
      name: 'Feriado',
      slug: 'Feriado Nacional',
    });

    await useCase.execute('org-1', dto, 'user-1');

    expect(eventTypeRepository.create).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({ slug: 'feriado-nacional' }),
      'user-1',
    );
  });

  it('deve lançar Conflict quando slug já existir na org', async () => {
    eventTypeRepository.findBySlug.mockResolvedValue(makeEventTypeEntity());

    await expect(
      useCase.execute('org-1', makeCreateEventTypeDTO(), 'user-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
