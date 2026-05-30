import { BadRequestException } from '@common/filters';
import { TagRepository } from '@modules/tag';
import { ResolveMaterialTagIdsUseCase } from './resolve-material-tag-ids.use-case';

describe('ResolveMaterialTagIdsUseCase', () => {
  let tagRepository: jest.Mocked<TagRepository>;
  let useCase: ResolveMaterialTagIdsUseCase;

  beforeEach(() => {
    tagRepository = {
      findManyByIds: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    useCase = new ResolveMaterialTagIdsUseCase(tagRepository);
  });

  it('deve retornar undefined quando tags não forem informadas', async () => {
    await expect(useCase.execute('org-id')).resolves.toBeUndefined();
    expect(tagRepository.findManyByIds).not.toHaveBeenCalled();
  });

  it('deve deduplicar ids e associar apenas tags existentes', async () => {
    tagRepository.findManyByIds.mockResolvedValue([
      {
        id: 'tag-id',
        name: 'Campanha',
      },
      {
        id: 'tag-id-2',
        name: 'Institucional',
      },
    ]);

    await expect(
      useCase.execute('org-id', [' tag-id ', 'tag-id', 'tag-id-2']),
    ).resolves.toEqual({
      existingTagIds: ['tag-id', 'tag-id-2'],
      newTagNames: [],
    });

    expect(tagRepository.findManyByIds).toHaveBeenCalledWith(
      ['tag-id', 'tag-id-2'],
      'org-id',
    );
  });

  it('deve rejeitar quando algum id não existir na organização', async () => {
    tagRepository.findManyByIds.mockResolvedValue([
      {
        id: 'tag-id',
        name: 'Campanha',
      },
    ]);

    await expect(
      useCase.execute('org-id', ['tag-id', 'invalid-id']),
    ).rejects.toThrow(BadRequestException);
    await expect(
      useCase.execute('org-id', ['tag-id', 'invalid-id']),
    ).rejects.toThrow(
      'Uma ou mais tags informadas não existem nesta organização',
    );
  });

  it('deve permitir limpar todas as tags quando array vier vazio', async () => {
    await expect(useCase.execute('org-id', [])).resolves.toEqual({
      existingTagIds: [],
      newTagNames: [],
    });
    expect(tagRepository.findManyByIds).not.toHaveBeenCalled();
  });
});
