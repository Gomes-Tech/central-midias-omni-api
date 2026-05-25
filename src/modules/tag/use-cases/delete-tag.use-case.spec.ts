import { BadRequestException } from '@common/filters';
import { TagRepository } from '../repository';
import { DeleteTagUseCase } from './delete-tag.use-case';
import { FindTagByIdUseCase } from './find-tag-by-id.use-case';
import { makeTagEntity } from './test-helpers';

describe('DeleteTagUseCase', () => {
  const organizationId = 'organization-id';
  let tagRepository: jest.Mocked<TagRepository>;
  let findTagByIdUseCase: { execute: jest.Mock };
  let useCase: DeleteTagUseCase;

  beforeEach(() => {
    tagRepository = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    findTagByIdUseCase = { execute: jest.fn() };

    useCase = new DeleteTagUseCase(
      tagRepository,
      findTagByIdUseCase as unknown as FindTagByIdUseCase,
    );
  });

  it('deve remover a tag sem vínculos', async () => {
    const tag = makeTagEntity();
    findTagByIdUseCase.execute.mockResolvedValue(tag);
    tagRepository.delete.mockResolvedValue(undefined);

    await expect(useCase.execute(tag.id, organizationId)).resolves.toBe(
      undefined,
    );
    expect(tagRepository.delete).toHaveBeenCalledWith(tag.id, organizationId);
  });

  it('deve impedir remoção quando houver materiais vinculados', async () => {
    findTagByIdUseCase.execute.mockResolvedValue(
      makeTagEntity({ materialsCount: 1 }),
    );

    await expect(useCase.execute('tag-id', organizationId)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('tag-id', organizationId)).rejects.toThrow(
      'Não é possível remover uma tag vinculada a materiais',
    );
  });

  it('deve impedir remoção quando houver buscas vinculadas', async () => {
    findTagByIdUseCase.execute.mockResolvedValue(
      makeTagEntity({ tagSearchesCount: 1 }),
    );

    await expect(useCase.execute('tag-id', organizationId)).rejects.toThrow(
      BadRequestException,
    );
    await expect(useCase.execute('tag-id', organizationId)).rejects.toThrow(
      'Não é possível remover uma tag vinculada a buscas',
    );
  });
});
