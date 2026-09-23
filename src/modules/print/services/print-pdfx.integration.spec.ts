import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateDocumentV3,
} from '@modules/material-template';
import type { PrintPresetSnapshot } from '../entities';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrintRendererService } from './print-renderer.service';
import {
  printImagePreset,
  printPng,
} from '../../../test-utils/print-image-fixtures';

const ICC_PATH = '/usr/share/color/icc/ghostscript/default_cmyk.icc';
const describeWithTools =
  ['gs', 'qpdf', 'pdfinfo', 'pdffonts', 'pdftoppm'].every((tool) =>
    existsSync(`/usr/bin/${tool}`),
  ) && existsSync(ICC_PATH)
    ? describe
    : describe.skip;

describeWithTools('PrintRendererService PDF/X integration', () => {
  it('converte para PDF/X-1a CMYK com output intent e boxes', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pdfx-integration-'));
    try {
      const service = new PrintRendererService(
        {} as never,
        {} as never,
        {} as never,
      );
      const internals = service as unknown as {
        createIntermediatePdf: (
          pages: Array<{
            canvas: MaterialTemplateDocumentV2['canvas'];
            layerOrder: string[];
            layers: MaterialTemplateDocumentV2['layers'];
            baseBuffer: Buffer;
            baseMimeType: string;
            baseSize: { width: number | null; height: number | null };
          }>,
          preset: PrintPresetSnapshot,
          assets: Map<string, never>,
        ) => Promise<Buffer>;
        createPdfXDefinition: (
          iccPath: string,
          preset: PrintPresetSnapshot,
        ) => string;
        applyPageBoxes: (
          path: string,
          preset: PrintPresetSnapshot,
        ) => Promise<void>;
      };
      const preset: PrintPresetSnapshot = {
        id: 'preset-id',
        name: 'Default CMYK',
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
          name: 'Default CMYK',
          storageKey: 'unused',
          checksum: 'unused',
          outputConditionIdentifier: 'Default CMYK',
        },
      };
      const document: MaterialTemplateDocumentV2 = {
        version: 2,
        canvas: { width: 2160, height: 3030 },
        layerOrder: [],
        layers: [],
      };
      const base = readFileSync(
        join(
          process.cwd(),
          'src/infrastructure/providers/mail/assets/footer-logos.png',
        ),
      );
      const intermediatePath = join(workspace, 'intermediate.pdf');
      const definitionPath = join(workspace, 'PDFX_def.ps');
      const outputPath = join(workspace, 'output.pdf');
      writeFileSync(
        intermediatePath,
        await internals.createIntermediatePdf(
          [
            {
              canvas: document.canvas,
              layerOrder: document.layerOrder,
              layers: document.layers,
              baseBuffer: base,
              baseMimeType: 'image/png',
              baseSize: { width: null, height: null },
            },
          ],
          preset,
          new Map<string, never>(),
        ),
      );
      writeFileSync(
        definitionPath,
        internals.createPdfXDefinition(ICC_PATH, preset),
      );

      execFileSync('gs', [
        '-dPDFX=1',
        '-dBATCH',
        '-dNOPAUSE',
        '-dSAFER',
        `--permit-file-read=${ICC_PATH}`,
        '-dCompatibilityLevel=1.3',
        '-sDEVICE=pdfwrite',
        '-sColorConversionStrategy=CMYK',
        '-sProcessColorModel=DeviceCMYK',
        '-dRenderIntent=1',
        `-sOutputICCProfile=${ICC_PATH}`,
        `-sOutputFile=${outputPath}`,
        definitionPath,
        intermediatePath,
      ]);
      await internals.applyPageBoxes(outputPath, preset);

      const info = execFileSync('pdfinfo', ['-box', outputPath], {
        encoding: 'utf8',
      });
      const inkCoverage = execFileSync(
        'gs',
        ['-dBATCH', '-dNOPAUSE', '-sDEVICE=inkcov', '-o', '-', outputPath],
        { encoding: 'utf8' },
      );
      const outputSource = readFileSync(outputPath, 'latin1');
      expect(info).toContain('PDF version:     1.3');
      expect(info).toMatch(/TrimBox:\s+34\.02\s+34\.02\s+629\.29\s+875\.91/);
      expect(info).toMatch(/BleedBox:\s+25\.51\s+25\.51\s+637\.80\s+884\.41/);
      expect(outputSource).not.toContain('/ArtBox');
      expect(outputSource).toContain('/OutputIntents');
      expect(outputSource).toContain('/DestOutputProfile');
      expect(outputSource).toContain('/GTS_PDFXVersion');
      expect(outputSource).not.toContain('/Subtype /Link');
      expect(outputSource).not.toContain('/URI');
      expect(inkCoverage).toMatch(/\sCMYK\b/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);

  it('renderiza V3 na ordem de sortOrder com boxes e ICC em um único PDF', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pdfx-multipage-'));
    try {
      const document: MaterialTemplateDocumentV3 = {
        version: 3,
        pages: [
          {
            materialFileId: 'file-late',
            canvas: { width: 1000, height: 1000 },
            layerOrder: [],
            layers: [],
          },
          {
            materialFileId: 'file-early',
            canvas: { width: 1000, height: 1000 },
            layerOrder: [],
            layers: [],
          },
        ],
      };
      const preset: PrintPresetSnapshot = {
        ...printImagePreset,
        bleedTopMm: 3,
        bleedRightMm: 3,
        bleedBottomMm: 3,
        bleedLeftMm: 3,
        includeCropMarks: true,
        cropMarkOffsetMm: 3,
        colorProfile: {
          ...printImagePreset.colorProfile,
          storageKey: 'profile',
        },
      };
      const objects = new Map<string, Buffer>([
        ['early', printPng(100, 100, () => [220, 30, 30])],
        ['late', printPng(100, 100, () => [30, 30, 220])],
        ['profile', readFileSync(ICC_PATH)],
      ]);
      const prisma = {
        printExport: {
          findUnique: jest.fn(async () => ({
            id: 'export',
            organizationId: 'org',
            userId: 'user',
            presetSnapshot: preset,
            template: {
              baseFile: null,
              assets: [],
              material: {
                materialFiles: [
                  {
                    id: 'file-late',
                    imageKey: 'late',
                    mimeType: 'image/png',
                    width: 100,
                    height: 100,
                    sortOrder: 8,
                  },
                  {
                    id: 'file-early',
                    imageKey: 'early',
                    mimeType: 'image/png',
                    width: 100,
                    height: 100,
                    sortOrder: 2,
                  },
                ],
              },
            },
          })),
        },
      };
      const storage = {
        readFile: jest.fn(async (key: string) => objects.get(key)!),
        readAsset: jest.fn(),
        writePrivateFile: jest.fn(async ({ path, buffer }) => {
          objects.set(path, buffer);
        }),
      };
      const imageInputs = {
        load: jest.fn(async () => new Map()),
        validateDpi: jest.fn(),
      };
      const renderer = new PrintRendererService(
        prisma as never,
        storage as never,
        imageInputs as never,
      );

      const artifact = await renderer.render('export', document);
      const outputPath = join(workspace, 'multipage.pdf');
      writeFileSync(outputPath, objects.get(artifact.fileKey)!);

      const info = execFileSync(
        'pdfinfo',
        ['-box', '-f', '1', '-l', '2', outputPath],
        { encoding: 'utf8' },
      );
      expect(info).toMatch(/Pages:\s+2\b/);
      expect(
        info.match(/TrimBox:\s+34\.02\s+34\.02\s+317\.48\s+317\.48/g),
      ).toHaveLength(2);
      expect(
        info.match(/BleedBox:\s+25\.51\s+25\.51\s+325\.98\s+325\.98/g),
      ).toHaveLength(2);
      const inspectedPath = join(workspace, 'multipage.qdf.pdf');
      execFileSync('qpdf', [
        '--qdf',
        '--object-streams=disable',
        outputPath,
        inspectedPath,
      ]);
      const inspected = readFileSync(inspectedPath, 'latin1');
      expect(inspected).toContain('/DestOutputProfile');
      expect(inspected).not.toContain('/Subtype /Link');
      expect(inspected).not.toContain('/URI');

      const centerPixel = (page: number) => {
        const rasterBase = join(workspace, `page-${page}`);
        execFileSync('pdftoppm', [
          '-f',
          String(page),
          '-l',
          String(page),
          '-singlefile',
          '-r',
          '20',
          outputPath,
          rasterBase,
        ]);
        const ppm = readFileSync(`${rasterBase}.ppm`);
        const header = /^P6\s+(\d+)\s+(\d+)\s+255\s/.exec(
          ppm.toString('ascii', 0, 80),
        )!;
        const width = Number(header[1]);
        const height = Number(header[2]);
        const offset =
          header[0].length +
          (Math.floor(height / 2) * width + Math.floor(width / 2)) * 3;
        return [...ppm.subarray(offset, offset + 3)];
      };
      const first = centerPixel(1);
      const second = centerPixel(2);
      expect(first[0]).toBeGreaterThan(first[2] + 40);
      expect(second[2]).toBeGreaterThan(second[0] + 40);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);
});
