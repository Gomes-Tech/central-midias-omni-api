import { TagRepository } from '../repository';
import { FindSelectTagsUseCase } from './find-select-tags.use-case';

describe('FindSelectTagsUseCase', () => {
  const organizationId = 'organization-id';
  let tagRepository: jest.Mocked<Pick<TagRepository, 'findSelect'>>;
  let useCase: FindSelectTagsUseCase;

  beforeEach(() => {
    tagRepository = { findSelect: jest.fn() };
    useCase = new FindSelectTagsUseCase(
      tagRepository as unknown as TagRepository,
    );
  });

  it('deve retornar a lista simplificada do repositório', async () => {
    const list = [
      { id: 'tag-1', name: 'Campanha' },
      { id: 'tag-2', name: 'Institucional' },
    ];
    tagRepository.findSelect.mockResolvedValue(list);

    await expect(useCase.execute(organizationId)).resolves.toEqual(list);
    expect(tagRepository.findSelect).toHaveBeenCalledWith(organizationId);
  });

  it('deve chamar repository.findSelect exatamente 1 vez', async () => {
    tagRepository.findSelect.mockResolvedValue([]);

    await expect(useCase.execute(organizationId)).resolves.toEqual([]);

    expect(tagRepository.findSelect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando repository.findSelect falhar', async () => {
    const error = new Error('Erro ao buscar tags');
    tagRepository.findSelect.mockRejectedValue(error);

    await expect(useCase.execute(organizationId)).rejects.toBe(error);
  });
});
