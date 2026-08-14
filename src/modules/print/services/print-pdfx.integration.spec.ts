import type { MaterialTemplateDocumentV2 } from '@modules/material-template';
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

const ICC_PATH = '/usr/share/color/icc/ghostscript/default_cmyk.icc';
const describeWithTools =
  existsSync('/usr/bin/gs') &&
  existsSync('/usr/bin/pdfinfo') &&
  existsSync(ICC_PATH)
    ? describe
    : describe.skip;

describeWithTools('PrintRendererService PDF/X integration', () => {
  it('converte para PDF/X-1a CMYK com output intent e boxes', async () => {
    const workspace = mkdtempSync(join(tmpdir(), 'pdfx-integration-'));
    try {
      const service = new PrintRendererService({} as never, {} as never);
      const internals = service as unknown as {
        createIntermediatePdf: (
          document: MaterialTemplateDocumentV2,
          preset: PrintPresetSnapshot,
          base: Buffer,
          assets: Map<string, never>,
        ) => Promise<Buffer>;
        createPdfXDefinition: (
          iccPath: string,
          preset: PrintPresetSnapshot,
        ) => string;
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
          document,
          preset,
          base,
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
      expect(info).toContain('TrimBox:');
      expect(info).toContain('BleedBox:');
      expect(outputSource).toContain('/OutputIntents');
      expect(outputSource).toContain('/DestOutputProfile');
      expect(outputSource).toContain('/GTS_PDFXVersion');
      expect(inkCoverage).toMatch(/\sCMYK\b/);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  }, 30_000);
});
