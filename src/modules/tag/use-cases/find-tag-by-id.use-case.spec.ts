import { NotFoundException } from '@common/filters';
import { TagRepository } from '../repository';
import { FindTagByIdUseCase } from './find-tag-by-id.use-case';
import { makeTagEntity } from './test-helpers';

describe('FindTagByIdUseCase', () => {
  const organizationId = 'organization-id';
  let tagRepository: jest.Mocked<TagRepository>;
  let useCase: FindTagByIdUseCase;

  beforeEach(() => {
    tagRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    useCase = new FindTagByIdUseCase(tagRepository);
  });

  it('deve retornar a tag quando existir', async () => {
    const tag = makeTagEntity();

    tagRepository.findById.mockResolvedValue(tag);

    await expect(useCase.execute(tag.id, organizationId)).resolves.toEqual(tag);
    expect(tagRepository.findById).toHaveBeenCalledWith(tag.id, organizationId);
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    tagRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing', organizationId);

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Tag não encontrada');
  });
});
