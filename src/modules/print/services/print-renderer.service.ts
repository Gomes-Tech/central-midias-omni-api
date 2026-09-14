import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { readRasterDimensions } from '@modules/asset/services/asset-file-validation.service';
import type { MaterialTemplateDocumentV2 } from '@modules/material-template';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { PrintPresetSnapshot } from '../entities';
import {
  getPrintFontPath,
  PRINT_FONT_FILES,
  resolvePrintFontFamily,
} from './print-fonts';
import {
  PreparedPrintImage,
  PrintImageInputService,
} from './print-image-input.service';

const execFileAsync = promisify(execFile);
const MM_TO_POINTS = 72 / 25.4;
const COMMAND_TIMEOUT_MS = 180_000;
const OUTPUT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_SIZE = 250 * 1024 * 1024;

export function getPrintImagePlacement(
  frameWidth: number,
  frameHeight: number,
  image: Pick<
    PreparedPrintImage,
    'width' | 'height' | 'fit' | 'positionX' | 'positionY' | 'zoom'
  >,
) {
  const widthScale = frameWidth / Math.max(image.width, 1);
  const heightScale = frameHeight / Math.max(image.height, 1);
  const baseScale =
    image.fit === 'contain'
      ? Math.min(widthScale, heightScale)
      : Math.max(widthScale, heightScale);
  const imageScale = baseScale * image.zoom;
  const width = image.width * imageScale;
  const height = image.height * imageScale;
  return {
    x: (frameWidth - width) * image.positionX,
    y: (frameHeight - height) * image.positionY,
    width,
    height,
  };
}

const RENDERING_INTENTS: Record<
  PrintPresetSnapshot['renderingIntent'],
  number
> = {
  PERCEPTUAL: 0,
  RELATIVE_COLORIMETRIC: 1,
  SATURATION: 2,
  ABSOLUTE_COLORIMETRIC: 3,
};

@Injectable()
export class PrintRendererService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly imageInputs: PrintImageInputService,
  ) {}

  async render(
    exportId: string,
    document: MaterialTemplateDocumentV2,
    onProgress: (progress: number) => Promise<void> = async () => undefined,
    inputIds: string[] = [],
  ) {
    const exportRecord = await this.prisma.printExport.findUnique({
      where: { id: exportId },
      include: {
        template: {
          include: {
            baseFile: true,
            assets: { include: { asset: true } },
          },
        },
      },
    });
    if (!exportRecord?.template.baseFile) {
      throw new InternalServerErrorException('Exportação sem imagem base');
    }
    const preset =
      exportRecord.presetSnapshot as unknown as PrintPresetSnapshot;
    const images = await this.imageInputs.load(
      exportRecord,
      document,
      inputIds,
    );
    this.imageInputs.validateDpi(document, [...images.values()], preset);
    const workspace = await fs.mkdtemp(join(tmpdir(), 'print-export-'));
    try {
      const intermediatePath = join(workspace, 'intermediate.pdf');
      const outputPath = join(workspace, 'output.pdf');
      const iccPath = join(workspace, 'output.icc');
      const definitionPath = join(workspace, 'PDFX_def.ps');

      const [baseBuffer, iccBuffer] = await Promise.all([
        this.storage.readFile(exportRecord.template.baseFile.imageKey),
        this.storage.readFile(preset.colorProfile.storageKey),
      ]);
      const assets = new Map(
        await Promise.all(
          exportRecord.template.assets.map(
            async ({ asset }) =>
              [
                asset.id,
                {
                  ...asset,
                  buffer: await this.storage.readAsset(asset.fileKey),
                },
              ] as const,
          ),
        ),
      );
      await onProgress(25);

      const intermediate = await this.createIntermediatePdf(
        document,
        preset,
        baseBuffer,
        exportRecord.template.baseFile.mimeType,
        {
          width: exportRecord.template.baseFile.width,
          height: exportRecord.template.baseFile.height,
        },
        assets,
        images,
      );
      await fs.writeFile(intermediatePath, intermediate);
      await fs.writeFile(iccPath, iccBuffer);
      await fs.writeFile(
        definitionPath,
        this.createPdfXDefinition(iccPath, preset),
        'utf8',
      );
      await onProgress(50);

      await this.run('gs', [
        '-dPDFX=1',
        '-dBATCH',
        '-dNOPAUSE',
        '-dSAFER',
        `--permit-file-read=${iccPath}`,
        '-dCompatibilityLevel=1.3',
        '-sDEVICE=pdfwrite',
        '-sColorConversionStrategy=CMYK',
        '-sProcessColorModel=DeviceCMYK',
        `-dRenderIntent=${RENDERING_INTENTS[preset.renderingIntent]}`,
        `-sOutputICCProfile=${iccPath}`,
        `-sOutputFile=${outputPath}`,
        definitionPath,
        intermediatePath,
      ]);
      await onProgress(75);
      await this.validateOutput(outputPath);
      await onProgress(90);
      const output = await fs.readFile(outputPath);
      if (!output.length || output.length > MAX_OUTPUT_SIZE) {
        throw new Error('Tamanho do PDF final inválido');
      }

      const fileKey = `print-exports/${exportRecord.organizationId}/${exportId}.pdf`;
      await this.storage.writePrivateFile({
        path: fileKey,
        buffer: output,
        mimeType: 'application/pdf',
      });
      await onProgress(95);
      return {
        fileKey,
        size: output.length,
        checksum: createHash('sha256').update(output).digest('hex'),
        expiresAt: new Date(Date.now() + OUTPUT_TTL_MS),
      };
    } finally {
      await fs.rm(workspace, { recursive: true, force: true });
    }
  }

  private async createIntermediatePdf(
    document: MaterialTemplateDocumentV2,
    preset: PrintPresetSnapshot,
    baseBuffer: Buffer,
    baseMimeType: string,
    baseSize: { width: number | null; height: number | null },
    assets: Map<string, { mimeType: string; name: string; buffer: Buffer }>,
    images: Map<string, PreparedPrintImage> = new Map(),
  ): Promise<Buffer> {
    const bleedWidthMm =
      preset.trimWidthMm + preset.bleedLeftMm + preset.bleedRightMm;
    const bleedHeightMm =
      preset.trimHeightMm + preset.bleedTopMm + preset.bleedBottomMm;
    const marksMarginMm = preset.includeCropMarks
      ? preset.cropMarkOffsetMm + 6
      : 0;
    const pageWidth = (bleedWidthMm + marksMarginMm * 2) * MM_TO_POINTS;
    const pageHeight = (bleedHeightMm + marksMarginMm * 2) * MM_TO_POINTS;
    const canvasX = marksMarginMm * MM_TO_POINTS;
    const canvasY = marksMarginMm * MM_TO_POINTS;
    const scaleX = (bleedWidthMm * MM_TO_POINTS) / document.canvas.width;
    const scaleY = (bleedHeightMm * MM_TO_POINTS) / document.canvas.height;

    const pdf = new PDFDocument({
      autoFirstPage: false,
      compress: false,
      margin: 0,
      pdfVersion: '1.3',
      info: { Title: 'Central Midias - arte para impressao' },
    });
    const chunks: Buffer[] = [];
    pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
    const completed = new Promise<Buffer>((resolve, reject) => {
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
    });
    pdf.addPage({ size: [pageWidth, pageHeight], margin: 0 });
    const bleedBox = [
      canvasX,
      canvasY,
      canvasX + bleedWidthMm * MM_TO_POINTS,
      canvasY + bleedHeightMm * MM_TO_POINTS,
    ];
    const trimBox = [
      canvasX + preset.bleedLeftMm * MM_TO_POINTS,
      canvasY + preset.bleedBottomMm * MM_TO_POINTS,
      canvasX + (preset.bleedLeftMm + preset.trimWidthMm) * MM_TO_POINTS,
      canvasY + (preset.bleedBottomMm + preset.trimHeightMm) * MM_TO_POINTS,
    ];
    (pdf.page as any).dictionary.data.BleedBox = bleedBox;
    (pdf.page as any).dictionary.data.TrimBox = trimBox;

    for (const family of Object.keys(PRINT_FONT_FILES)) {
      pdf.registerFont(
        family,
        getPrintFontPath(family as keyof typeof PRINT_FONT_FILES),
      );
    }

    const bleedWidthPt = bleedWidthMm * MM_TO_POINTS;
    const bleedHeightPt = bleedHeightMm * MM_TO_POINTS;
    pdf.rect(canvasX, canvasY, bleedWidthPt, bleedHeightPt).fill('#ffffff');

    const probed = readRasterDimensions(baseBuffer, baseMimeType);
    const baseWidth = baseSize.width ?? probed?.width ?? document.canvas.width;
    const baseHeight =
      baseSize.height ?? probed?.height ?? document.canvas.height;
    const coverScale = Math.max(
      bleedWidthPt / Math.max(baseWidth, 1),
      bleedHeightPt / Math.max(baseHeight, 1),
    );
    const coveredWidth = baseWidth * coverScale;
    const coveredHeight = baseHeight * coverScale;
    pdf.save();
    pdf.rect(canvasX, canvasY, bleedWidthPt, bleedHeightPt).clip();
    pdf.image(
      baseBuffer,
      canvasX + (bleedWidthPt - coveredWidth) / 2,
      canvasY + (bleedHeightPt - coveredHeight) / 2,
      {
        width: coveredWidth,
        height: coveredHeight,
      },
    );
    pdf.restore();

    const layers = new Map(document.layers.map((layer) => [layer.id, layer]));
    for (const id of document.layerOrder) {
      const layer = layers.get(id);
      if (!layer?.isVisible) continue;
      if (layer.type === 'image-placeholder') {
        const image = images.get(layer.id);
        if (!image) throw new Error(`Marcador ${layer.id}: imagem obrigatória`);
        const width = layer.width * scaleX;
        const height = layer.height * scaleY;
        pdf.save();
        pdf
          .translate(
            canvasX + layer.x * scaleX + width / 2,
            canvasY + layer.y * scaleY + height / 2,
          )
          .rotate(layer.rotation);
        pdf.rect(-width / 2, -height / 2, width, height).clip();
        const placement = getPrintImagePlacement(width, height, image);
        pdf.image(
          image.buffer,
          -width / 2 + placement.x,
          -height / 2 + placement.y,
          {
            width: placement.width,
            height: placement.height,
          },
        );
        pdf.restore();
        continue;
      }
      if (layer.type === 'asset') {
        const asset = assets.get(layer.assetId);
        if (!asset) throw new Error(`Asset ausente: ${layer.id}`);
        const x = canvasX + layer.x * scaleX;
        const y = canvasY + layer.y * scaleY;
        const width = layer.width * scaleX;
        const height = layer.height * scaleY;
        pdf.save();
        pdf.translate(x + width / 2, y + height / 2).rotate(layer.rotation);
        if (asset.mimeType === 'image/svg+xml') {
          SVGtoPDF(
            pdf,
            asset.buffer.toString('utf8'),
            -width / 2,
            -height / 2,
            {
              width,
              height,
              preserveAspectRatio: 'none',
            },
          );
        } else {
          pdf.image(asset.buffer, -width / 2, -height / 2, { width, height });
        }
        pdf.restore();
        continue;
      }

      pdf.save();
      pdf
        .translate(canvasX + layer.x * scaleX, canvasY + layer.y * scaleY)
        .rotate(layer.rotation);
      let x = 0;
      let y = 0;
      let lineHeight = (layer.runs[0]?.fontSize ?? 16) * scaleY * 1.2;
      for (const run of layer.runs) {
        const requestedFont = resolvePrintFontFamily(run.fontFamily, run.bold);
        const fontSize = run.fontSize * scaleY;
        const pieces = run.text.split('\n');
        pieces.forEach((piece, index) => {
          lineHeight = Math.max(lineHeight, fontSize * 1.2);
          pdf.font(requestedFont).fontSize(fontSize).fillColor(run.fill);
          if (piece) {
            if (run.italic) {
              pdf.save().transform(1, 0, -0.212, 1, 0, 0);
            }
            pdf.text(piece, x, y, { lineBreak: false });
            if (run.italic) pdf.restore();
            const width = pdf.widthOfString(piece);
            if (run.underline) {
              pdf
                .moveTo(x, y + fontSize * 1.08)
                .lineTo(x + width, y + fontSize * 1.08)
                .lineWidth(Math.max(0.5, fontSize / 18))
                .stroke(run.fill);
            }
            x += width;
          }
          if (index < pieces.length - 1) {
            y += lineHeight;
            x = 0;
            lineHeight = (layer.runs[0]?.fontSize ?? 16) * scaleY * 1.2;
          }
        });
      }
      pdf.restore();
    }

    if (preset.includeCropMarks) {
      this.drawCropMarks(pdf, canvasX, canvasY, preset);
    }
    pdf.end();
    return completed;
  }

  private drawCropMarks(
    pdf: PDFKit.PDFDocument,
    canvasX: number,
    canvasY: number,
    preset: PrintPresetSnapshot,
  ) {
    const left = canvasX + preset.bleedLeftMm * MM_TO_POINTS;
    const right = left + preset.trimWidthMm * MM_TO_POINTS;
    const top = canvasY + preset.bleedTopMm * MM_TO_POINTS;
    const bottom = top + preset.trimHeightMm * MM_TO_POINTS;
    const length = 5 * MM_TO_POINTS;
    const offset = preset.cropMarkOffsetMm * MM_TO_POINTS;
    pdf.save().strokeColor('#000000').lineWidth(0.25);
    for (const x of [left, right]) {
      pdf
        .moveTo(x, top - offset - length)
        .lineTo(x, top - offset)
        .stroke();
      pdf
        .moveTo(x, bottom + offset)
        .lineTo(x, bottom + offset + length)
        .stroke();
    }
    for (const y of [top, bottom]) {
      pdf
        .moveTo(left - offset - length, y)
        .lineTo(left - offset, y)
        .stroke();
      pdf
        .moveTo(right + offset, y)
        .lineTo(right + offset + length, y)
        .stroke();
    }
    pdf.restore();
  }

  private createPdfXDefinition(iccPath: string, preset: PrintPresetSnapshot) {
    const escape = (value: string) =>
      value
        .replaceAll('\\', '\\\\')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)');
    return `%!PS-Adobe-3.0\n[/_objdef {icc_profile} /type /stream /OBJ pdfmark\n[{icc_profile} << /N 4 >> /PUT pdfmark\n[{icc_profile} (${escape(iccPath)}) (r) file /PUT pdfmark\n[/_objdef {OutputIntent_PDFX} /type /dict /OBJ pdfmark\n[{OutputIntent_PDFX} << /Type /OutputIntent /S /GTS_PDFX /OutputCondition (${escape(preset.colorProfile.name)}) /OutputConditionIdentifier (${escape(preset.colorProfile.outputConditionIdentifier)}) /RegistryName (http://www.color.org) /DestOutputProfile {icc_profile} >> /PUT pdfmark\n[{Catalog} << /OutputIntents [{OutputIntent_PDFX}] >> /PUT pdfmark\n[ /GTS_PDFXVersion (PDF/X-1a:2001) /GTS_PDFXConformance (PDF/X-1a:2001) /DOCINFO pdfmark\n`;
  }

  private async validateOutput(path: string) {
    await this.run('qpdf', ['--check', path]);
    const inspectedPath = join(path, '..', 'inspected.qdf.pdf');
    await this.run('qpdf', [
      '--qdf',
      '--object-streams=disable',
      path,
      inspectedPath,
    ]);
    const inspected = await fs.readFile(inspectedPath, 'latin1');
    if (
      !inspected.includes('/GTS_PDFXVersion') ||
      !inspected.includes('/OutputIntents') ||
      !inspected.includes('/DestOutputProfile')
    ) {
      throw new Error('PDF sem metadados PDF/X ou output intent');
    }
    const profileRef = /\/DestOutputProfile\s+(\d+)\s+(\d+)\s+R/.exec(
      inspected,
    );
    if (!profileRef) throw new Error('PDF sem referência ao perfil ICC');
    const { stdout: embeddedProfile } = await execFileAsync(
      'qpdf',
      [
        `--show-object=${profileRef[1]},${profileRef[2]}`,
        '--filtered-stream-data',
        inspectedPath,
      ],
      {
        encoding: 'buffer',
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 5 * 1024 * 1024,
        windowsHide: true,
      },
    );
    if (
      embeddedProfile.length < 128 ||
      embeddedProfile.readUInt32BE(0) !== embeddedProfile.length ||
      embeddedProfile.toString('ascii', 36, 40) !== 'acsp' ||
      embeddedProfile.toString('ascii', 16, 20) !== 'CMYK'
    ) {
      throw new Error('PDF contém perfil ICC vazio ou inválido');
    }
    const { stdout: info } = await this.run('pdfinfo', ['-box', path]);
    if (!info.includes('TrimBox:') || !info.includes('BleedBox:')) {
      throw new Error('PDF sem caixas de corte e sangria');
    }
    const { stdout: fonts } = await this.run('pdffonts', [path]);
    const fontLines = fonts.split('\n').slice(2).filter(Boolean);
    if (
      fontLines.some((line) => {
        const columns = line.trim().split(/\s+/);
        return columns[columns.length - 5]?.toLowerCase() !== 'yes';
      })
    ) {
      throw new Error('PDF contém fonte não incorporada');
    }
    const { stdout: inkCoverage } = await this.run('gs', [
      '-dBATCH',
      '-dNOPAUSE',
      '-sDEVICE=inkcov',
      '-o',
      '-',
      path,
    ]);
    if (
      !/^\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+CMYK\b/m.test(
        inkCoverage,
      )
    ) {
      throw new Error('Não foi possível validar as separações CMYK');
    }
    await this.run('gs', ['-dBATCH', '-dNOPAUSE', '-sDEVICE=nullpage', path]);
  }

  private run(command: string, args: string[]) {
    return execFileAsync(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
      windowsHide: true,
    });
  }
}
