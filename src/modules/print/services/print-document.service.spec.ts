import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '@modules/material-template';
import { MaterialTemplateDocumentService } from '@modules/material-template';
import { PrintDocumentService } from './print-document.service';
import {
  placeholder,
  placeholderDocument,
} from '../../../test-utils/print-image-fixtures';

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

  it.each(['x', 'y', 'width', 'height', 'rotation', 'isVisible'])(
    'mantém %s do marcador definido pelo admin',
    (property) => {
      const customized = {
        ...placeholderDocument,
        layers: [
          { ...placeholder, [property]: property === 'isVisible' ? false : 33 },
        ],
      };
      expect(() =>
        service.validateCustomizedDocument(placeholderDocument, customized),
      ).toThrow('não permitidas');
    },
  );

  it('inclui fotos no hash sem depender da ordem de envio e preserva hashes legados', () => {
    const first = [
      { layerId: 'b', checksum: '1' },
      { layerId: 'a', checksum: '2' },
    ];
    expect(service.hash(placeholderDocument, first)).toBe(
      service.hash(placeholderDocument, [...first].reverse()),
    );
    expect(service.hash(placeholderDocument, first)).not.toBe(
      service.hash(placeholderDocument, [
        { layerId: 'b', checksum: '3' },
        first[1],
      ]),
    );
    expect(service.hash(placeholderDocument, first)).not.toBe(
      service.hash(placeholderDocument, [
        { ...first[0], fit: 'contain', positionX: 0, zoom: 1.5 },
        first[1],
      ]),
    );
    expect(service.hash(document, [])).toBe(service.hash(document));
  });

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

  it('rejeita template V1 publicado', () => {
    const v1 = {
      version: 1,
      canvas: { width: 100, height: 100 },
      layerOrder: [],
      layers: [],
    };
    expect(() => service.validateCustomizedDocument(v1, v1)).toThrow(
      'template V2 ou V3',
    );
  });

  const page = {
    canvas: document.canvas,
    layerOrder: document.layerOrder,
    layers: document.layers,
  };

  it('rejeita troca de versão entre publicado e personalizado', () => {
    const v3 = { version: 3, pages: [{ materialFileId: 'file-1', ...page }] };
    expect(() => service.validateCustomizedDocument(document, v3)).toThrow(
      'estrutura do template foi alterada',
    );
  });

  describe('V3', () => {
    const multipage: MaterialTemplateDocumentV3 = {
      version: 3,
      pages: [
        { materialFileId: 'file-1', ...structuredClone(page) },
        {
          materialFileId: 'file-2',
          canvas: placeholderDocument.canvas,
          layerOrder: ['editable', 'photo'],
          layers: [structuredClone(page.layers[1]), { ...placeholder }],
        },
      ],
    };

    function editText(value: MaterialTemplateDocumentV3, pageIndex: number) {
      const layer = value.pages[pageIndex].layers.find(
        (candidate) => candidate.id === 'editable',
      );
      if (layer?.type !== 'text') throw new Error('Fixture inválida');
      layer.runs = [{ ...layer.runs[0], text: `Maria ${pageIndex}` }];
    }

    it('aceita troca dos runs liberados em qualquer página', () => {
      const customized = structuredClone(multipage);
      editText(customized, 0);
      editText(customized, 1);
      expect(service.validateCustomizedDocument(multipage, customized)).toEqual(
        customized,
      );
    });

    it('aceita somente href editável e remove todos os links antes da impressão', () => {
      const published = structuredClone(multipage);
      published.pages[0].links = [
        {
          id: 'static',
          name: 'Site',
          href: 'https://example.com',
          editableProperties: [],
          target: { kind: 'layer', layerId: 'asset' },
        },
        {
          id: 'agent',
          name: 'WhatsApp',
          href: null,
          editableProperties: ['href'],
          target: { kind: 'area', x: 10, y: 20, width: 100, height: 50 },
        },
      ];
      const customized = structuredClone(published);
      customized.pages[0].links![1].href = 'https://wa.me/5511999999999';

      const printable = service.validateCustomizedDocument(
        published,
        customized,
      );
      expect(printable.version).toBe(3);
      if (printable.version !== 3) return;
      expect(printable.pages.every((candidate) => !candidate.links)).toBe(true);
      expect(JSON.stringify(printable)).not.toContain('wa.me');

      const another = structuredClone(customized);
      another.pages[0].links![1].href = 'https://example.com/agent';
      const anotherPrintable = service.validateCustomizedDocument(
        published,
        another,
      );
      expect(service.hash(printable)).toBe(service.hash(anotherPrintable));
    });

    it.each([
      [
        'href estático',
        (value: MaterialTemplateDocumentV3) => {
          value.pages[0].links![0].href = 'https://attacker.example';
        },
      ],
      [
        'alvo',
        (value: MaterialTemplateDocumentV3) => {
          value.pages[0].links![1].target = {
            kind: 'area',
            x: 20,
            y: 20,
            width: 100,
            height: 50,
          };
        },
      ],
      [
        'permissão',
        (value: MaterialTemplateDocumentV3) => {
          value.pages[0].links![1].editableProperties = [];
        },
      ],
    ] as Array<[string, (value: MaterialTemplateDocumentV3) => void]>)(
      'rejeita alteração de %s em link pelo agente',
      (_label, mutate) => {
        const published = structuredClone(multipage);
        published.pages[0].links = [
          {
            id: 'static',
            name: 'Site',
            href: 'https://example.com',
            editableProperties: [],
            target: { kind: 'layer', layerId: 'asset' },
          },
          {
            id: 'agent',
            name: 'Agente',
            href: null,
            editableProperties: ['href'],
            target: { kind: 'area', x: 10, y: 20, width: 100, height: 50 },
          },
        ];
        const customized = structuredClone(published);
        customized.pages[0].links![1].href = 'https://example.com/agent';
        mutate(customized);
        expect(() =>
          service.validateCustomizedDocument(published, customized),
        ).toThrow('alterações não permitidas');
      },
    );

    it.each<[string, (value: MaterialTemplateDocumentV3) => void]>([
      ['mover camada', (value) => (value.pages[1].layers[0].x = 1)],
      [
        'ocultar camada',
        (value) => (value.pages[1].layers[1].isVisible = false),
      ],
      ['reordenar camadas', (value) => value.pages[1].layerOrder.reverse()],
      ['redimensionar canvas', (value) => (value.pages[0].canvas.width = 10)],
      ['reordenar páginas', (value) => value.pages.reverse()],
      [
        'texto bloqueado',
        (value) => {
          const layer = value.pages[0].layers[2];
          if (layer.type === 'text') layer.runs[0].text = 'Alterado';
        },
      ],
    ])('rejeita %s', (_label, mutate) => {
      const customized = structuredClone(multipage);
      editText(customized, 1);
      mutate(customized);
      expect(() =>
        service.validateCustomizedDocument(multipage, customized),
      ).toThrow('alterações não permitidas');
    });

    it.each<[string, (value: MaterialTemplateDocumentV3) => void]>([
      [
        'trocar materialFileId',
        (value) => (value.pages[1].materialFileId = 'file-3'),
      ],
      ['remover página', (value) => value.pages.pop()],
      [
        'remover camada',
        (value) => {
          value.pages[0].layers.pop();
          value.pages[0].layerOrder.pop();
        },
      ],
      [
        'trocar camada de página',
        (value) => {
          const [text, photo] = value.pages[1].layers;
          value.pages[1].layers = [text, { ...photo, id: 'asset' }];
          value.pages[1].layerOrder = ['editable', 'asset'];
        },
      ],
    ])('rejeita estrutura ao %s', (_label, mutate) => {
      const customized = structuredClone(multipage);
      mutate(customized);
      expect(() =>
        service.validateCustomizedDocument(multipage, customized),
      ).toThrow('estrutura do template foi alterada');
    });

    it('ordena fotos do hash por materialFileId e depois por layerId', () => {
      const images = [
        { materialFileId: 'file-2', layerId: 'photo', checksum: '1' },
        { materialFileId: 'file-1', layerId: 'photo', checksum: '2' },
        { materialFileId: 'file-1', layerId: 'another', checksum: '3' },
      ];
      expect(service.hash(multipage, images)).toBe(
        service.hash(multipage, [images[2], images[0], images[1]]),
      );
      expect(service.hash(multipage, images)).not.toBe(
        service.hash(multipage, [
          { ...images[0], materialFileId: 'file-1' },
          { ...images[1], materialFileId: 'file-2' },
          images[2],
        ]),
      );
      expect(service.hash(multipage, images)).not.toBe(
        service.hash(multipage, [
          { ...images[0], fit: 'contain', positionY: 0.2, zoom: 2 },
          images[1],
          images[2],
        ]),
      );
    });
  });

  it('mantém o hash V2 legado de fotos sem materialFileId', () => {
    expect(
      service.hash(placeholderDocument, [
        { layerId: 'photo', checksum: 'abc' },
        { layerId: 'another', checksum: 'def', fit: 'contain', zoom: 2 },
      ]),
    ).toBe('16e421054c7d0f41bf9c0dd34d8a739097e57414e1ce0c452f89777f59a6e0bd');
  });
});
