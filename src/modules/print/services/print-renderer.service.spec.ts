import type { MaterialTemplateDocumentV2 } from '@modules/material-template';
import type { PrintPresetSnapshot } from '../entities';
import { PrintRendererService } from './print-renderer.service';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const png = readFileSync(
  join(
    process.cwd(),
    'src/infrastructure/providers/mail/assets/footer-logos.png',
  ),
);

const preset: PrintPresetSnapshot = {
  id: 'preset-id',
  name: 'A4 gráfica',
  trimWidthMm: 210,
  trimHeightMm: 297,
  bleedTopMm: 3,
  bleedRightMm: 3,
  bleedBottomMm: 3,
  bleedLeftMm: 3,
  safeMarginTopMm: 5,
  safeMarginRightMm: 5,
  safeMarginBottomMm: 5,
  safeMarginLeftMm: 5,
  minimumDpi: 300,
  includeCropMarks: true,
  cropMarkOffsetMm: 3,
  renderingIntent: 'RELATIVE_COLORIMETRIC',
  updatedAt: new Date(0).toISOString(),
  colorProfile: {
    id: 'profile-id',
    name: 'CMYK',
    storageKey: 'private/profile.icc',
    checksum: 'checksum',
    outputConditionIdentifier: 'Reference',
  },
};

const document: MaterialTemplateDocumentV2 = {
  version: 2,
  canvas: { width: 2160, height: 3030 },
  layerOrder: ['bitmap', 'vector', 'text'],
  layers: [
    {
      id: 'bitmap',
      type: 'asset',
      name: 'Bitmap',
      assetId: 'bitmap-asset',
      x: 100,
      y: 100,
      width: 300,
      height: 300,
      rotation: 12,
      isVisible: true,
      editableProperties: [],
    },
    {
      id: 'vector',
      type: 'asset',
      name: 'Vetor',
      assetId: 'vector-asset',
      x: 500,
      y: 100,
      width: 300,
      height: 200,
      rotation: -8,
      isVisible: true,
      editableProperties: [],
    },
    {
      id: 'text',
      type: 'text',
      name: 'Chamada',
      x: 180,
      y: 500,
      rotation: 5,
      isVisible: true,
      editableProperties: ['content'],
      profileBinding: null,
      runs: [
        {
          text: 'Linha um\n',
          fontFamily: 'Averta CY',
          fontSize: 42,
          fill: '#111111',
          bold: false,
          italic: true,
          underline: false,
        },
        {
          text: 'destaque',
          fontFamily: 'Averta CY Bold',
          fontSize: 48,
          fill: '#e95814',
          bold: true,
          italic: false,
          underline: true,
        },
      ],
    },
  ],
};

describe('PrintRendererService', () => {
  it('gera o PDF híbrido intermediário com boxes, fontes e camadas', async () => {
    const service = new PrintRendererService({} as never, {} as never);
    const createIntermediatePdf = (
      service as unknown as {
        createIntermediatePdf: (
          document: MaterialTemplateDocumentV2,
          preset: PrintPresetSnapshot,
          base: Buffer,
          baseMimeType: string,
          baseSize: { width: number | null; height: number | null },
          assets: Map<
            string,
            { mimeType: string; name: string; buffer: Buffer }
          >,
        ) => Promise<Buffer>;
      }
    ).createIntermediatePdf.bind(service);

    const result = await createIntermediatePdf(
      document,
      preset,
      png,
      'image/png',
      { width: null, height: null },
      new Map([
        [
          'bitmap-asset',
          { mimeType: 'image/png', name: 'Bitmap', buffer: png },
        ],
        [
          'vector-asset',
          {
            mimeType: 'image/svg+xml',
            name: 'Vetor',
            buffer: Buffer.from(
              '<svg viewBox="0 0 100 100"><path fill="#00a88f" d="M0 0h100v100H0z"/></svg>',
            ),
          },
        ],
      ]),
    );

    const source = result.toString('latin1');
    expect(result.subarray(0, 4).toString()).toBe('%PDF');
    expect(result.length).toBeGreaterThan(20_000);
    expect(source).toContain('/TrimBox');
    expect(source).toContain('/BleedBox');
    expect(source).toMatch(/Averta/i);
  }, 15_000);
});
