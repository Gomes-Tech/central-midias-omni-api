import { TagRepository } from '../repository';
import { FindAllTagsUseCase } from './find-all-tags.use-case';
import { makeFindAllTagsFiltersDTO, makeTagEntity } from './test-helpers';

describe('FindAllTagsUseCase', () => {
  const organizationId = 'organization-id';
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

    await expect(useCase.execute(organizationId, filters)).resolves.toEqual(
      tags,
    );
    expect(tagRepository.findAll).toHaveBeenCalledWith(organizationId, filters);
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const tags = [makeTagEntity()];

    tagRepository.findAll.mockResolvedValue(tags);

    await expect(useCase.execute(organizationId)).resolves.toEqual(tags);
    expect(tagRepository.findAll).toHaveBeenCalledWith(organizationId, {});
  });
});
