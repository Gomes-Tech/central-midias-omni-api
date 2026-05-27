import {
  makeCreateTagDTO,
  makeFindAllTagsFiltersDTO,
  makeTagEntity,
  makeUpdateTagDTO,
} from './test-helpers';

describe('tag use-cases test-helpers', () => {
  it('makeUpdateTagDTO aplica overrides', () => {
    expect(makeUpdateTagDTO({ name: 'Institucional' }).name).toBe(
      'Institucional',
    );
    expect(makeUpdateTagDTO()).toEqual({});
  });

  it('makeFindAllTagsFiltersDTO aplica overrides', () => {
    expect(makeFindAllTagsFiltersDTO({ searchTerm: 'cam' }).searchTerm).toBe(
      'cam',
    );
    expect(makeFindAllTagsFiltersDTO()).toEqual({});
  });

  it('makeCreateTagDTO e makeTagEntity aplicam overrides', () => {
    expect(makeCreateTagDTO({ name: 'Novo' }).name).toBe('Novo');
    expect(makeTagEntity({ id: 'tag-2' }).id).toBe('tag-2');
  });
});
