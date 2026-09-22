import { BadRequestException } from '@common/filters';
import {
  MaterialTemplateDocumentV1,
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '../entities';
import { MaterialTemplateDocumentService } from './material-template-document.service';
import {
  placeholder,
  placeholderDocument,
} from '../../../test-utils/print-image-fixtures';

describe('MaterialTemplateDocumentService', () => {
  const service = new MaterialTemplateDocumentService();
  it('valida marcadores V2 sem dependência de asset e sem texto', () => {
    expect(service.validate(placeholderDocument)).toEqual(placeholderDocument);
    expect(service.getAssetIds(placeholderDocument)).toEqual([]);
    expect(service.hasEditableContent(placeholderDocument)).toBe(true);
    expect(
      service.hasEditableContent({
        ...placeholderDocument,
        layers: [{ ...placeholder, isVisible: false }],
      }),
    ).toBe(false);
  });

  it.each([
    { width: 0 },
    { height: -1 },
    { width: Infinity },
    { x: NaN },
    { editableProperties: [] },
    { editableProperties: ['image', 'image'] },
    { editableProperties: ['position'] },
    { assetId: 'asset' },
    { url: 'https://example.com/photo.png' },
    { buffer: 'photo' },
    { src: 'data:image/png;base64,photo' },
  ])('rejeita marcador inválido: %j', (patch) => {
    expect(() =>
      service.validate({
        ...placeholderDocument,
        layers: [{ ...placeholder, ...patch }],
      }),
    ).toThrow();
  });

  it('aceita até 20 marcadores e rejeita V1', () => {
    const layers = Array.from({ length: 20 }, (_, i) => ({
      ...placeholder,
      id: `photo-${i}`,
    }));
    const value = {
      ...placeholderDocument,
      layers,
      layerOrder: layers.map((layer) => layer.id),
    };
    expect(service.validate(value)).toEqual(value);
    expect(() =>
      service.validate({
        ...value,
        layers: [...layers, { ...placeholder, id: 'extra' }],
        layerOrder: [...value.layerOrder, 'extra'],
      }),
    ).toThrow('20 marcadores');
    expect(() =>
      service.validate({ ...placeholderDocument, version: 1 }),
    ).toThrow('Tipo de camada');
  });

  it('redimensiona o marcador mantendo a permissão e a rotação', () => {
    expect(
      service.scaleForBaseReplacement(placeholderDocument, 2000, 500).layers[0],
    ).toEqual({
      ...placeholder,
      x: 200,
      y: 50,
      width: 50,
      height: 50,
    });
  });
  const document: MaterialTemplateDocumentV1 = {
    version: 1,
    canvas: { width: 1080, height: 1080 },
    layerOrder: ['asset-1', 'text-1'],
    layers: [
      {
        id: 'asset-1',
        type: 'asset',
        name: 'Logo',
        assetId: 'library-asset-1',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        rotation: 0,
        isVisible: true,
        editableProperties: [],
      },
      {
        id: 'text-1',
        type: 'text',
        name: 'Nome',
        value: 'Nome do agente',
        x: 100,
        y: 900,
        rotation: 0,
        fontSize: 40,
        fontFamily: 'Arial',
        fill: '#111111',
        isVisible: true,
        editableProperties: ['value'],
        profileBinding: 'NAME',
      },
    ],
  };
  const richDocument: MaterialTemplateDocumentV2 = {
    version: 2,
    canvas: { width: 1080, height: 1080 },
    layerOrder: ['text-1'],
    layers: [
      {
        id: 'text-1',
        type: 'text',
        name: 'Chamada',
        x: 100,
        y: 200,
        rotation: 0,
        isVisible: true,
        editableProperties: ['content'],
        profileBinding: 'NAME',
        runs: [
          {
            text: 'Texto ',
            fontSize: 40,
            fontFamily: 'Arial',
            fill: '#111111',
            bold: false,
            italic: false,
            underline: false,
          },
          {
            text: 'destacado',
            fontSize: 48,
            fontFamily: 'Georgia',
            fill: '#ff5500',
            bold: true,
            italic: true,
            underline: true,
          },
        ],
      },
    ],
  };
  const multipageDocument: MaterialTemplateDocumentV3 = {
    version: 3,
    pages: [
      {
        materialFileId: 'material-file-1',
        canvas: { width: 1080, height: 1080 },
        layerOrder: ['asset-1'],
        layers: [
          {
            id: 'asset-1',
            type: 'asset',
            name: 'Logo',
            assetId: 'library-asset-1',
            x: 100,
            y: 200,
            width: 300,
            height: 150,
            rotation: 0,
            isVisible: true,
            editableProperties: [],
          },
        ],
      },
      {
        materialFileId: 'material-file-2',
        canvas: { width: 1000, height: 1000 },
        layerOrder: ['text-1', 'photo-1'],
        layers: [richDocument.layers[0], { ...placeholder, id: 'photo-1' }],
      },
    ],
  };

  it('valida o documento V1 e extrai dependências', () => {
    expect(service.validate(document)).toBe(document);
    expect(service.getAssetIds(document)).toEqual(['library-asset-1']);
    expect(service.hasEditableText(document)).toBe(true);
  });

  it('rejeita ordem de camadas inconsistente', () => {
    expect(() =>
      service.validate({ ...document, layerOrder: ['text-1'] }),
    ).toThrow(BadRequestException);
  });

  it('valida rich text V2 e reconhece permissão de conteúdo', () => {
    expect(service.validate(richDocument)).toBe(richDocument);
    expect(service.hasEditableText(richDocument)).toBe(true);
  });

  it('valida V3 e percorre todas as páginas para assets e conteúdo editável', () => {
    expect(service.validate(multipageDocument)).toBe(multipageDocument);
    expect(service.getAssetIds(multipageDocument)).toEqual(['library-asset-1']);
    expect(service.hasEditableText(multipageDocument)).toBe(true);
    expect(service.hasEditableContent(multipageDocument)).toBe(true);
  });

  it.each([
    ['sem páginas', { ...multipageDocument, pages: [] }],
    [
      'com mais de 20 páginas',
      {
        ...multipageDocument,
        pages: Array.from({ length: 21 }, (_, index) => ({
          ...multipageDocument.pages[0],
          materialFileId: `material-file-${index}`,
        })),
      },
    ],
    [
      'com arquivo repetido',
      {
        ...multipageDocument,
        pages: [
          multipageDocument.pages[0],
          {
            ...multipageDocument.pages[1],
            materialFileId: 'material-file-1',
          },
        ],
      },
    ],
    [
      'com ordem inválida em uma página',
      {
        ...multipageDocument,
        pages: [
          multipageDocument.pages[0],
          { ...multipageDocument.pages[1], layerOrder: [] },
        ],
      },
    ],
    [
      'com mais de 200 camadas em uma página',
      {
        ...multipageDocument,
        pages: [
          {
            ...multipageDocument.pages[0],
            layers: Array.from({ length: 201 }, (_, index) => ({
              ...multipageDocument.pages[0].layers[0],
              id: `asset-${index}`,
            })),
            layerOrder: Array.from(
              { length: 201 },
              (_, index) => `asset-${index}`,
            ),
          },
        ],
      },
    ],
  ])('rejeita V3 %s', (_case, value) => {
    expect(() => service.validate(value)).toThrow(BadRequestException);
  });

  it('limita a 20 os marcadores visíveis no documento V3 inteiro', () => {
    const pages = [0, 1].map((pageIndex) => {
      const layers = Array.from({ length: 11 }, (_, layerIndex) => ({
        ...placeholder,
        id: `photo-${pageIndex}-${layerIndex}`,
        isVisible: !(pageIndex === 1 && layerIndex >= 9),
      }));
      return {
        materialFileId: `material-file-${pageIndex}`,
        canvas: { width: 1000, height: 1000 },
        layerOrder: layers.map((layer) => layer.id),
        layers,
      };
    });
    const value: MaterialTemplateDocumentV3 = { version: 3, pages };

    expect(service.validate(value)).toBe(value);
    pages[1].layers[9].isVisible = true;
    expect(() => service.validate(value)).toThrow('20 marcadores');
  });

  it('aceita os tamanhos proporcionais usados em canvases grandes', () => {
    const largeDocument = structuredClone(richDocument);
    largeDocument.canvas = { width: 6000, height: 5000 };
    const text = largeDocument.layers[0];
    if (text.type !== 'text') throw new Error('Camada de teste inválida');
    text.runs = text.runs.map((run) => ({ ...run, fontSize: 1500 }));

    expect(service.validate(largeDocument)).toBe(largeDocument);
  });

  it('mantém um teto técnico para o tamanho da fonte', () => {
    const invalidDocument = structuredClone(richDocument);
    const text = invalidDocument.layers[0];
    if (text.type !== 'text') throw new Error('Camada de teste inválida');
    text.runs = text.runs.map((run) => ({ ...run, fontSize: 1801 }));

    expect(() => service.validate(invalidDocument)).toThrow(
      'Tamanho da fonte inválido',
    );
  });

  it('rejeita trechos V2 inválidos e o limite de conteúdo', () => {
    const richTextLayer = richDocument.layers[0];
    if (richTextLayer.type !== 'text')
      throw new Error('Camada de teste inválida');
    expect(() =>
      service.validate({
        ...richDocument,
        layers: [{ ...richTextLayer, runs: [] }],
      }),
    ).toThrow('Trechos do texto inválidos');
    expect(() =>
      service.validate({
        ...richDocument,
        layers: [
          {
            ...richTextLayer,
            runs: [{ ...richTextLayer.runs[0], text: 'x'.repeat(2001) }],
          },
        ],
      }),
    ).toThrow('Conteúdo do texto inválido');
  });

  it('rejeita binding em texto não editável', () => {
    const invalid = structuredClone(document);
    const text = invalid.layers[1];
    if (text.type === 'text') text.editableProperties = [];

    expect(() => service.validate(invalid)).toThrow(
      'Textos vinculados ao perfil precisam ser editáveis',
    );
  });

  it('redimensiona posições e usa o menor fator nos tamanhos', () => {
    const scaled = service.scaleForBaseReplacement(document, 2160, 540);
    expect(scaled.canvas).toEqual({ width: 2160, height: 540 });
    expect(scaled.layers[0]).toEqual(
      expect.objectContaining({ x: 200, y: 100, width: 150, height: 75 }),
    );
    expect(scaled.layers[1]).toEqual(
      expect.objectContaining({ x: 200, y: 450, fontSize: 20 }),
    );
  });

  it('redimensiona todos os trechos do documento V2', () => {
    const scaled = service.scaleForBaseReplacement(richDocument, 2160, 540);
    expect(scaled.version).toBe(2);
    if (scaled.version !== 2 || scaled.layers[0].type !== 'text') return;
    expect(scaled.layers[0]).toEqual(
      expect.objectContaining({ x: 200, y: 100 }),
    );
    expect(scaled.layers[0].runs.map((run) => run.fontSize)).toEqual([20, 24]);
  });

  it('redimensiona somente a página V3 indicada', () => {
    const scaled = service.scaleForBaseReplacement(
      multipageDocument,
      2000,
      500,
      'material-file-2',
    );

    expect(scaled.version).toBe(3);
    if (scaled.version !== 3) return;
    expect(scaled.pages[0]).toBe(multipageDocument.pages[0]);
    expect(scaled.pages[1].canvas).toEqual({ width: 2000, height: 500 });
    expect(scaled.pages[1].layers[0]).toEqual(
      expect.objectContaining({ x: 200, y: 100 }),
    );
    expect(scaled.pages[1].layers[1]).toEqual(
      expect.objectContaining({ x: 200, y: 50, width: 50, height: 50 }),
    );
  });

  it('rejeita redimensionamento V3 sem uma página válida', () => {
    expect(() =>
      service.scaleForBaseReplacement(multipageDocument, 2000, 500),
    ).toThrow('Arquivo da página não informado');
    expect(() =>
      service.scaleForBaseReplacement(
        multipageDocument,
        2000,
        500,
        'inexistente',
      ),
    ).toThrow('Página do arquivo não encontrada');
  });

  it('normaliza V2 publicado para V3 ao incluir outra imagem', () => {
    const next = service.withAddedFiles(
      richDocument,
      [{ id: 'material-file-1', width: 800, height: 600 }],
      [{ id: 'material-file-2', width: 1200, height: 800 }],
    );

    expect(next.version).toBe(3);
    expect(next.pages).toHaveLength(2);
    expect(next.pages[0]).toEqual({
      materialFileId: 'material-file-1',
      canvas: richDocument.canvas,
      layerOrder: richDocument.layerOrder,
      layers: richDocument.layers,
    });
    expect(next.pages[1]).toEqual({
      materialFileId: 'material-file-2',
      canvas: { width: 1200, height: 800 },
      layerOrder: [],
      layers: [],
    });
  });

  it('normaliza documento nulo para uma página por imagem atual e nova', () => {
    const next = service.withAddedFiles(
      null,
      [
        { id: 'frente', width: 1000, height: 500 },
        { id: 'verso', width: 900, height: 400 },
      ],
      [{ id: 'extra', width: 640, height: 480 }],
    );

    expect(next).toEqual({
      version: 3,
      pages: [
        {
          materialFileId: 'frente',
          canvas: { width: 1000, height: 500 },
          layerOrder: [],
          layers: [],
        },
        {
          materialFileId: 'verso',
          canvas: { width: 900, height: 400 },
          layerOrder: [],
          layers: [],
        },
        {
          materialFileId: 'extra',
          canvas: { width: 640, height: 480 },
          layerOrder: [],
          layers: [],
        },
      ],
    });
  });

  it('preserva canvas e camadas V1 na primeira página ao incluir imagem', () => {
    const next = service.withAddedFiles(
      document,
      [
        { id: 'material-file-1', width: 1080, height: 1080 },
        { id: 'material-file-2', width: 500, height: 700 },
      ],
      [{ id: 'material-file-3', width: 400, height: 400 }],
    );

    expect(next.pages[0]).toEqual({
      materialFileId: 'material-file-1',
      canvas: document.canvas,
      layerOrder: ['asset-1', 'text-1'],
      layers: [
        document.layers[0],
        {
          id: 'text-1',
          type: 'text',
          name: 'Nome',
          x: 100,
          y: 900,
          rotation: 0,
          isVisible: true,
          editableProperties: ['content'],
          profileBinding: 'NAME',
          runs: [
            {
              text: 'Nome do agente',
              fontSize: 40,
              fontFamily: 'Arial',
              fill: '#111111',
              bold: false,
              italic: false,
              underline: false,
            },
          ],
        },
      ],
    });
    expect(next.pages[1].layers).toEqual([]);
    expect(next.pages[1].canvas).toEqual({ width: 500, height: 700 });
    expect(next.pages[2].layers).toEqual([]);
  });

  it('acrescenta página vazia sem reescrever um documento V3', () => {
    const next = service.withAddedFiles(
      multipageDocument,
      [
        { id: 'material-file-1', width: 1080, height: 1080 },
        { id: 'material-file-2', width: 1000, height: 1000 },
      ],
      [{ id: 'material-file-3', width: 320, height: 240 }],
    );

    expect(next.pages[0]).toEqual(multipageDocument.pages[0]);
    expect(next.pages[1]).toEqual(multipageDocument.pages[1]);
    expect(next.pages[2]).toEqual({
      materialFileId: 'material-file-3',
      canvas: { width: 320, height: 240 },
      layerOrder: [],
      layers: [],
    });
  });

  it('rejeita imagem atual sem dimensões quando o documento não define o canvas', () => {
    expect(() =>
      service.withAddedFiles(
        null,
        [{ id: 'material-file-1', width: null, height: null }],
        [{ id: 'material-file-2', width: 100, height: 100 }],
      ),
    ).toThrow('Imagem sem dimensões não pode virar página');
  });

  it('remove a página do meio de um V3 e preserva a ordem das demais', () => {
    const thirdPage = {
      materialFileId: 'material-file-3',
      canvas: { width: 640, height: 480 },
      layerOrder: [],
      layers: [],
    };
    const next = service.withoutFile(
      {
        version: 3,
        pages: [...multipageDocument.pages, thirdPage],
      },
      [
        { id: 'material-file-1', width: 1080, height: 1080 },
        { id: 'material-file-2', width: 1000, height: 1000 },
        { id: 'material-file-3', width: 640, height: 480 },
      ],
      'material-file-2',
    );

    expect(next.pages.map((page) => page.materialFileId)).toEqual([
      'material-file-1',
      'material-file-3',
    ]);
    expect(next.pages[0]).toEqual(multipageDocument.pages[0]);
    expect(next.pages[1]).toEqual(thirdPage);
    expect(service.getAssetIds(next)).toEqual(['library-asset-1']);
  });

  it('remove a segunda página de um V2 e mantém as camadas na primeira', () => {
    const next = service.withoutFile(
      richDocument,
      [
        { id: 'frente', width: 1080, height: 1080 },
        { id: 'verso', width: 800, height: 600 },
      ],
      'verso',
    );

    expect(next.pages).toEqual([
      {
        materialFileId: 'frente',
        canvas: richDocument.canvas,
        layerOrder: richDocument.layerOrder,
        layers: richDocument.layers,
      },
    ]);
  });

  it('descarta as camadas da página única quando a imagem removida é a primeira', () => {
    const next = service.withoutFile(
      richDocument,
      [
        { id: 'frente', width: 1080, height: 1080 },
        { id: 'verso', width: 800, height: 600 },
      ],
      'frente',
    );

    expect(next.pages).toEqual([
      {
        materialFileId: 'verso',
        canvas: { width: 800, height: 600 },
        layerOrder: [],
        layers: [],
      },
    ]);
  });

  it('remove a imagem do meio de um documento nulo e preserva as páginas vizinhas', () => {
    const next = service.withoutFile(
      null,
      [
        { id: 'a', width: 100, height: 80 },
        { id: 'b', width: 200, height: 90 },
        { id: 'c', width: 300, height: 100 },
      ],
      'b',
    );

    expect(next.pages.map((page) => page.materialFileId)).toEqual(['a', 'c']);
    expect(next.pages[0].canvas).toEqual({ width: 100, height: 80 });
    expect(next.pages[1].canvas).toEqual({ width: 300, height: 100 });
  });
});
