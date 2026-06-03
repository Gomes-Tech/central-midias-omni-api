import {
  normalizeMaterialTags,
  readMaterialTagsField,
} from './material-tags.transform';

describe('normalizeMaterialTags', () => {
  it('deve retornar undefined quando valor for undefined ou null', () => {
    expect(normalizeMaterialTags(undefined)).toBeUndefined();
    expect(normalizeMaterialTags(null)).toBeUndefined();
  });

  it('deve aceitar array de strings e sanitizar', () => {
    expect(normalizeMaterialTags([' Campanha ', 'Institucional'])).toEqual([
      'Campanha',
      'Institucional',
    ]);
  });

  it('deve achatar arrays aninhados', () => {
    expect(normalizeMaterialTags([['Campanha'], 'Novo'])).toEqual([
      'Campanha',
      'Novo',
    ]);
  });

  it('deve ignorar valores não string', () => {
    expect(normalizeMaterialTags([1, true, 'Tag'])).toEqual(['Tag']);
  });

  it('deve ignorar strings vazias', () => {
    expect(normalizeMaterialTags(['', '   ', 'Válida'])).toEqual(['Válida']);
  });

  it('deve retornar vazio quando JSON parseado não for array', () => {
    const parseSpy = jest
      .spyOn(JSON, 'parse')
      .mockReturnValueOnce({ not: 'array' } as never);

    expect(normalizeMaterialTags('[x]')).toEqual([]);

    parseSpy.mockRestore();
  });

  it('deve parsear JSON array em string', () => {
    expect(normalizeMaterialTags('["Campanha","Novo"]')).toEqual([
      'Campanha',
      'Novo',
    ]);
  });

  it('deve retornar string única quando JSON for inválido', () => {
    expect(normalizeMaterialTags('[invalid')).toEqual(['[invalid']);
  });

  it('deve retornar string quando JSON entre colchetes falhar no parse', () => {
    expect(normalizeMaterialTags('[invalid]')).toEqual(['[invalid]']);
  });

  it('deve tratar JSON objeto como string quando parse não retornar array', () => {
    expect(normalizeMaterialTags('{"a":1}')).toEqual(['{"a":1}']);
  });

  it('deve aceitar string simples', () => {
    expect(normalizeMaterialTags('Campanha')).toEqual(['Campanha']);
  });

  it('deve extrair name de objetos em array JSON', () => {
    expect(
      normalizeMaterialTags('[{"name":"Campanha"},{"name":"Novo"}]'),
    ).toEqual(['Campanha', 'Novo']);
  });

  it('deve separar tags por vírgula em string simples', () => {
    expect(normalizeMaterialTags('Campanha, Novo')).toEqual([
      'Campanha',
      'Novo',
    ]);
  });

  it('deve ler tags[] como fallback do body multipart', () => {
    expect(
      normalizeMaterialTags(readMaterialTagsField({ 'tags[]': ['Campanha'] })),
    ).toEqual(['Campanha']);
  });

  it('deve ignorar objetos sem name válido', () => {
    expect(normalizeMaterialTags([{ id: 1 }, { name: 123 }])).toEqual([]);
  });
});

describe('readMaterialTagsField', () => {
  it('deve retornar tags quando o campo tags estiver presente', () => {
    expect(readMaterialTagsField({ tags: ['Campanha', 'Novo'] })).toEqual([
      'Campanha',
      'Novo',
    ]);
  });

  it('deve retornar undefined quando tags e tags[] estiverem ausentes', () => {
    expect(readMaterialTagsField({})).toBeUndefined();
  });
});
