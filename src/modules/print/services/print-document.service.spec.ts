import type { MaterialTemplateDocumentV2 } from '@modules/material-template';
import { MaterialTemplateDocumentService } from '@modules/material-template';
import { PrintDocumentService } from './print-document.service';

const document: MaterialTemplateDocumentV2 = {
  version: 2,
  canvas: { width: 1080, height: 1080 },
  layerOrder: ['asset', 'editable', 'locked'],
  layers: [
    {
      id: 'asset',
      type: 'asset',
      name: 'Logo',
      assetId: 'asset-id',
      x: 20,
      y: 30,
      width: 100,
      height: 80,
      rotation: 0,
      isVisible: true,
      editableProperties: [],
    },
    {
      id: 'editable',
      type: 'text',
      name: 'Nome',
      x: 100,
      y: 200,
      rotation: 0,
      isVisible: true,
      editableProperties: ['content'],
      profileBinding: 'NAME',
      runs: [
        {
          text: 'Nome',
          fontFamily: 'Averta CY',
          fontSize: 32,
          fill: '#111111',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    },
    {
      id: 'locked',
      type: 'text',
      name: 'Cargo',
      x: 100,
      y: 250,
      rotation: 0,
      isVisible: true,
      editableProperties: [],
      profileBinding: null,
      runs: [
        {
          text: 'Consultor',
          fontFamily: 'Averta CY',
          fontSize: 24,
          fill: '#111111',
          bold: false,
          italic: false,
          underline: false,
        },
      ],
    },
  ],
};

describe('PrintDocumentService', () => {
  const service = new PrintDocumentService(
    new MaterialTemplateDocumentService(),
  );

  it('aceita somente a troca dos runs de texto liberado', () => {
    const customized = structuredClone(document);
    const editable = customized.layers[1];
    if (editable.type !== 'text') throw new Error('Fixture inválida');
    editable.runs = [{ ...editable.runs[0], text: 'Maria' }];

    expect(service.validateCustomizedDocument(document, customized)).toEqual(
      customized,
    );
  });

  it.each([
    ['posição', (value: MaterialTemplateDocumentV2) => (value.layers[1].x = 1)],
    [
      'ordem',
      (value: MaterialTemplateDocumentV2) => value.layerOrder.reverse(),
    ],
    [
      'asset',
      (value: MaterialTemplateDocumentV2) => {
        const layer = value.layers[0];
        if (layer.type === 'asset') layer.assetId = 'outro-asset';
      },
    ],
    [
      'texto bloqueado',
      (value: MaterialTemplateDocumentV2) => {
        const layer = value.layers[2];
        if (layer.type === 'text') layer.runs[0].text = 'Alterado';
      },
    ],
  ])('rejeita alteração de %s', (_label, mutate) => {
    const customized = structuredClone(document);
    mutate(customized);
    expect(() =>
      service.validateCustomizedDocument(document, customized),
    ).toThrow('alterações não permitidas');
  });

  it('produz hash determinístico independentemente da ordem das chaves', () => {
    expect(service.hash(document)).toBe(
      service.hash(structuredClone(document)),
    );
  });
});
