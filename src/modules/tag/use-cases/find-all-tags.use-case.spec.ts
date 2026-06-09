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
    const response = {
      data: [makeTagEntity()],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    tagRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute(organizationId, filters)).resolves.toEqual(
      response,
    );
    expect(tagRepository.findAll).toHaveBeenCalledWith(filters, organizationId);
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const response = {
      data: [makeTagEntity()],
      total: 1,
      page: 1,
      totalPages: 1,
    };

    tagRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute(organizationId)).resolves.toEqual(response);
    expect(tagRepository.findAll).toHaveBeenCalledWith({}, organizationId);
  });
});
