import { EventTypeRepository } from '../repository';
import { FindAllEventTypesUseCase } from './find-all-event-types.use-case';
import { makeEventTypeEntity } from './test-helpers';

describe('FindAllEventTypesUseCase', () => {
  let eventTypeRepository: jest.Mocked<Pick<EventTypeRepository, 'findAll'>>;
  let useCase: FindAllEventTypesUseCase;

  beforeEach(() => {
    eventTypeRepository = {
      findAll: jest.fn().mockResolvedValue([makeEventTypeEntity()]),
    };

    useCase = new FindAllEventTypesUseCase(
      eventTypeRepository as unknown as EventTypeRepository,
    );
  });

  it('deve listar tipos com filtros isActive e searchTerm', async () => {
    const filters = { isActive: true, searchTerm: 'feriado' };

    const result = await useCase.execute('org-1', filters);

    expect(result).toHaveLength(1);
    expect(eventTypeRepository.findAll).toHaveBeenCalledWith('org-1', filters);
  });

  it('deve listar sem filtros quando omitidos', async () => {
    await useCase.execute('org-1');

    expect(eventTypeRepository.findAll).toHaveBeenCalledWith('org-1', {});
  });
});
