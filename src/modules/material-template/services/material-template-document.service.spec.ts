import { BadRequestException } from '@common/filters';
import { MaterialTemplateDocumentV1 } from '../entities';
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
});
