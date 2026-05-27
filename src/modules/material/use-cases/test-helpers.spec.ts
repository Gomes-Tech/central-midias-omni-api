import {
  makeCreateMaterialDTO,
  makeFindAllMaterialsFiltersDTO,
  makeMaterialDetails,
  makeMaterialFile,
  makeMaterialListItem,
  makeMaterialTagSummary,
  makeUpdateMaterialDTO,
  makeUploadFile,
} from './test-helpers';

describe('material use-cases test-helpers', () => {
  it('makeUpdateMaterialDTO aplica overrides', () => {
    expect(makeUpdateMaterialDTO({ name: 'Novo' }).name).toBe('Novo');
    expect(makeUpdateMaterialDTO()).toEqual({});
  });

  it('makeFindAllMaterialsFiltersDTO aplica overrides', () => {
    expect(
      makeFindAllMaterialsFiltersDTO({ searchTerm: 'inst' }).searchTerm,
    ).toBe('inst');
    expect(makeFindAllMaterialsFiltersDTO()).toEqual({});
  });

  it('makeCreateMaterialDTO e demais helpers aplicam overrides', () => {
    expect(makeCreateMaterialDTO({ name: 'X' }).name).toBe('X');
    expect(makeMaterialListItem({ id: 'm2' }).id).toBe('m2');
    expect(makeMaterialDetails({ deletedAt: new Date() }).deletedAt).toBeInstanceOf(
      Date,
    );
    expect(makeMaterialFile({ size: 512 }).size).toBe(512);
    expect(makeMaterialTagSummary({ name: 'T' }).name).toBe('T');
    expect(makeUploadFile({ originalname: 'a.png' }).originalname).toBe('a.png');
  });
});
