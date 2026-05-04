import { TagRepository } from '../repository';
import { FindAllTagsUseCase } from './find-all-tags.use-case';
import {
  makeFindAllTagsFiltersDTO,
  makeTagEntity,
} from './test-helpers';

describe('FindAllTagsUseCase', () => {
  let tagRepository: jest.Mocked<TagRepository>;
  let useCase: FindAllTagsUseCase;

  beforeEach(() => {
    tagRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    useCase = new FindAllTagsUseCase(tagRepository);
  });

  it('deve retornar as tags filtradas', async () => {
    const filters = makeFindAllTagsFiltersDTO({ searchTerm: 'cam' });
    const tags = [makeTagEntity()];

    tagRepository.findAll.mockResolvedValue(tags);

    await expect(useCase.execute(filters)).resolves.toEqual(tags);
    expect(tagRepository.findAll).toHaveBeenCalledWith(filters);
  });
});
