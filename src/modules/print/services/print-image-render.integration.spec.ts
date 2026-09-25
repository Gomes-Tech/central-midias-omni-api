import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrintRendererService } from './print-renderer.service';
import { PrintImageInputService } from './print-image-input.service';
import {
  placeholder,
  placeholderDocument,
  printImageFile,
  printImagePreset,
  printJpegExif,
  printPng,
} from '../../../test-utils/print-image-fixtures';
import type { MaterialTemplateDocumentV2 } from '@modules/material-template';

const iccPath = '/usr/share/color/icc/ghostscript/default_cmyk.icc';
const withTools =
  ['gs', 'qpdf', 'pdfinfo', 'pdffonts', 'pdftoppm'].every((tool) =>
    existsSync(`/usr/bin/${tool}`),
  ) && existsSync(iccPath)
    ? describe
    : describe.skip;

withTools('Image placeholders - real PDF/X render', () => {
  it('renderiza cover, contain, posição, zoom, EXIF e rotação no pipeline real', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'print-image-qa-'));
    try {
      const document: MaterialTemplateDocumentV2 = {
        ...placeholderDocument,
        layers: [
          { ...placeholder, id: 'landscape', width: 200, height: 200 },
          { ...placeholder, id: 'portrait', x: 400, width: 200, height: 200 },
          {
            ...placeholder,
            id: 'rotated',
            x: 200,
            y: 500,
            width: 200,
            height: 100,
            rotation: 30,
          },
          { ...placeholder, id: 'jpeg', x: 700, width: 100, height: 200 },
          {
            ...placeholder,
            id: 'contain',
            x: 400,
            y: 400,
            width: 200,
            height: 200,
          },
          {
            ...placeholder,
            id: 'zoomed',
            x: 650,
            y: 400,
            width: 200,
            height: 200,
          },
          {
            id: 'overlay',
            type: 'asset',
            name: 'Sobreposição',
            assetId: 'yellow',
            x: 180,
            y: 180,
            width: 40,
            height: 40,
            rotation: 0,
            isVisible: true,
            editableProperties: [],
          },
        ],
        layerOrder: [
          'landscape',
          'portrait',
          'rotated',
          'jpeg',
          'contain',
          'zoomed',
          'overlay',
        ],
      };
      const files = [
        printImageFile(
          printPng(400, 200, (x) =>
            x < 100
              ? [220, 30, 30, 255]
              : x >= 300
                ? [30, 30, 220, 255]
                : [20, 190, 50, 128],
          ),
          'landscape',
        ),
        printImageFile(
          printPng(200, 400, (_x, y) =>
            y < 100 ? [30, 30, 220] : y >= 300 ? [20, 190, 50] : [230, 110, 20],
          ),
          'portrait',
        ),
        printImageFile(
          printPng(200, 100, () => [170, 40, 170]),
          'rotated',
        ),
        {
          ...printImageFile(printJpegExif, 'jpeg'),
          mimetype: 'image/jpeg',
          originalname: 'photo.jpg',
        },
        printImageFile(
          printPng(400, 100, () => [20, 190, 50]),
          'contain',
        ),
        printImageFile(
          printPng(400, 200, (x) => (x < 100 ? [220, 30, 30] : [30, 30, 220])),
          'zoomed',
        ),
      ];
      const bindings = files.map((file) => ({
        layerId: file.fieldname,
        fileField: file.fieldname,
        ...(file.fieldname === 'portrait' ? { positionY: 1 } : {}),
        ...(file.fieldname === 'contain'
          ? { fit: 'contain' as const, positionY: 0 }
          : {}),
        ...(file.fieldname === 'zoomed' ? { positionX: 1, zoom: 2 } : {}),
      }));
      const owner = { id: 'export', organizationId: 'org', userId: 'agent' };
      const preset = {
        ...printImagePreset,
        colorProfile: { ...printImagePreset.colorProfile, storageKey: 'icc' },
      };
      const base = printPng(1000, 1000, () => [255, 255, 255]);
      const objects = new Map<string, Buffer>([
        ['base', base],
        ['icc', readFileSync(iccPath)],
      ]);
      let rows: any[] = [];
      const prisma = {
        printExportInput: {
          createMany: jest.fn(async ({ data }) => {
            rows = data;
          }),
          findMany: jest.fn(async () => rows),
        },
        printExport: {
          findUnique: jest.fn(async () => ({
            ...owner,
            presetSnapshot: preset,
            template: {
              baseFile: {
                imageKey: 'base',
                mimeType: 'image/png',
                width: 1000,
                height: 1000,
              },
              assets: [
                {
                  asset: {
                    id: 'yellow',
                    fileKey: 'yellow',
                    name: 'Sobreposição',
                    mimeType: 'image/svg+xml',
                  },
                },
              ],
            },
          })),
        },
      };
      const storage = {
        readFile: jest.fn(async (key) => objects.get(key)),
        writePrivateFile: jest.fn(async ({ path, buffer }) => {
          objects.set(path, buffer);
        }),
        readAsset: jest.fn(async () =>
          Buffer.from(
            '<svg viewBox="0 0 40 40"><path fill="#ffff00" d="M0 0h40v40H0z"/></svg>',
          ),
        ),
      };
      const inputs = new PrintImageInputService(
        prisma as never,
        storage as never,
      );
      const prepared = inputs.prepare(document, bindings, files);
      inputs.validateDpi(document, prepared, preset);
      const inputIds = await inputs.stage(owner, prepared);
      const renderer = new PrintRendererService(
        prisma as never,
        storage as never,
        inputs,
      );
      const artifact = await renderer.render(
        owner.id,
        document,
        async () => undefined,
        inputIds,
      );
      const output = objects.get(artifact.fileKey)!;
      expect(output.subarray(0, 4).toString()).toBe('%PDF');
      expect(artifact.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 23 * 60 * 60 * 1000,
      );
      const pdfPath = join(workspace, 'placeholders.pdf');
      writeFileSync(pdfPath, output);
      const structure = JSON.parse(
        execFileSync('qpdf', ['--json', pdfPath], { encoding: 'utf8' }),
      );
      const intent = Object.values(structure.qpdf[1]).find(
        (object: any) => object.value?.['/DestOutputProfile'],
      ) as any;
      const reference = intent.value['/DestOutputProfile'].split(' ');
      const profile = execFileSync('qpdf', [
        `--show-object=${reference[0]},${reference[1]}`,
        '--filtered-stream-data',
        pdfPath,
      ]);
      expect(profile).toEqual(readFileSync(iccPath));
      execFileSync('pdftoppm', [
        '-r',
        '254',
        '-singlefile',
        pdfPath,
        join(workspace, 'raster'),
      ]);
      const ppm = readFileSync(join(workspace, 'raster.ppm'));
      const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(
        ppm.toString('ascii', 0, 80),
      )!;
      expect(header).not.toBeNull();
      const width = Number(header[1]);
      const pixel = (x: number, y: number) => [
        ...ppm.subarray(
          header[0].length + (y * width + x) * 3,
          header[0].length + (y * width + x) * 3 + 3,
        ),
      ];
      const green = pixel(115, 200);
      expect(green[1]).toBeGreaterThan(green[0] + 30);
      expect(green[1]).toBeGreaterThan(green[2] + 30);
      const orange = pixel(500, 115);
      expect(orange[0]).toBeGreaterThan(orange[1] + 30);
      expect(orange[1]).toBeGreaterThan(orange[2] + 20);
      const yellow = pixel(200, 200);
      expect(yellow[0]).toBeGreaterThan(150);
      expect(yellow[1]).toBeGreaterThan(150);
      expect(yellow[2]).toBeLessThan(100);
      expect(pixel(200, 500).every((channel) => channel > 230)).toBe(true);
      const purple = pixel(300, 550);
      expect(purple[0]).toBeGreaterThan(purple[1] + 30);
      expect(purple[2]).toBeGreaterThan(purple[1] + 30);
      const blue = pixel(750, 200);
      expect(blue[2]).toBeGreaterThan(blue[0] + 30);
      const contained = pixel(500, 425);
      expect(contained[1]).toBeGreaterThan(contained[0] + 30);
      expect(pixel(500, 575).every((channel) => channel > 230)).toBe(true);
      const zoomed = pixel(750, 500);
      expect(zoomed[2]).toBeGreaterThan(zoomed[0] + 30);
      expect(pixel(10, 10).every((channel) => channel > 230)).toBe(true);

      if (process.env.PRINT_IMAGE_QA_DIR) {
        mkdirSync(process.env.PRINT_IMAGE_QA_DIR, { recursive: true });
        copyFileSync(
          pdfPath,
          join(process.env.PRINT_IMAGE_QA_DIR, 'placeholders.pdf'),
        );
        execFileSync('pdftoppm', [
          '-r',
          '150',
          '-singlefile',
          '-png',
          pdfPath,
          join(process.env.PRINT_IMAGE_QA_DIR, 'placeholders'),
        ]);
      }
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);
});
