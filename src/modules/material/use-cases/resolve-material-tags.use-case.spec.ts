import { TagRepository } from '@modules/tag';
import { ResolveMaterialTagsUseCase } from './resolve-material-tags.use-case';

describe('ResolveMaterialTagsUseCase', () => {
  let tagRepository: jest.Mocked<TagRepository>;
  let useCase: ResolveMaterialTagsUseCase;

  beforeEach(() => {
    tagRepository = {
      findManyByNames: jest.fn(),
    } as unknown as jest.Mocked<TagRepository>;

    useCase = new ResolveMaterialTagsUseCase(tagRepository);
  });

  it('deve retornar undefined quando tags não forem informadas', async () => {
    await expect(useCase.execute('org-id')).resolves.toBeUndefined();
    expect(tagRepository.findManyByNames).not.toHaveBeenCalled();
  });

  it('deve deduplicar tags e separar existentes de novas', async () => {
    tagRepository.findManyByNames.mockResolvedValue([
      {
        id: 'tag-id',
        name: 'Campanha',
      },
    ]);

    await expect(
      useCase.execute('org-id', [' Campanha ', 'campanha', 'Novo']),
    ).resolves.toEqual({
      existingTagIds: ['tag-id'],
      newTagNames: ['Novo'],
    });

    expect(tagRepository.findManyByNames).toHaveBeenCalledWith(
      ['Campanha', 'Novo'],
      'org-id',
    );
  });

  it('deve ignorar strings vazias e duplicadas na normalização', async () => {
    tagRepository.findManyByNames.mockResolvedValue([]);

    await expect(
      useCase.execute('org-id', ['', '  ', 'Novo', 'novo']),
    ).resolves.toEqual({
      existingTagIds: [],
      newTagNames: ['Novo'],
    });

    expect(tagRepository.findManyByNames).toHaveBeenCalledWith(
      ['Novo'],
      'org-id',
    );
  });

  it('deve permitir limpar todas as tags quando array vier vazio', async () => {
    await expect(useCase.execute('org-id', [])).resolves.toEqual({
      existingTagIds: [],
      newTagNames: [],
    });
  });

  it('deve resolver apenas tags existentes quando todas já estiverem cadastradas', async () => {
    tagRepository.findManyByNames.mockResolvedValue([
      { id: 'tag-1', name: 'Campanha' },
      { id: 'tag-2', name: 'Institucional' },
    ]);

    await expect(
      useCase.execute('org-id', ['Campanha', 'Institucional']),
    ).resolves.toEqual({
      existingTagIds: ['tag-1', 'tag-2'],
      newTagNames: [],
    });
  });

  it('deve corresponder tag existente ignorando espaços no nome retornado pelo repositório', async () => {
    tagRepository.findManyByNames.mockResolvedValue([
      { id: 'tag-id', name: '  Campanha  ' },
    ]);

    await expect(useCase.execute('org-id', ['Campanha'])).resolves.toEqual({
      existingTagIds: ['tag-id'],
      newTagNames: [],
    });
  });

  it('deve classificar todas as tags como novas quando nenhuma existir no banco', async () => {
    tagRepository.findManyByNames.mockResolvedValue([]);

    await expect(useCase.execute('org-id', ['Alpha', 'Beta'])).resolves.toEqual({
      existingTagIds: [],
      newTagNames: ['Alpha', 'Beta'],
    });
  });
});
