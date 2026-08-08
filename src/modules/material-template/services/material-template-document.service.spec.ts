import { BadRequestException } from '@common/filters';
import {
  MaterialTemplateDocumentV1,
  MaterialTemplateDocumentV2,
} from '../entities';
import { MaterialTemplateDocumentService } from './material-template-document.service';

describe('MaterialTemplateDocumentService', () => {
  const service = new MaterialTemplateDocumentService();
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
});
