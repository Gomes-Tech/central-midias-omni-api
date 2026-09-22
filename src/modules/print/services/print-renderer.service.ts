import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { readRasterDimensions } from '@modules/asset/services/asset-file-validation.service';
import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateLayerV2,
} from '@modules/material-template';
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
  printImageKey,
} from './print-image-input.service';
import type { PrintableDocument } from './print-document.service';

const execFileAsync = promisify(execFile);
const MM_TO_POINTS = 72 / 25.4;
const COMMAND_TIMEOUT_MS = 180_000;
const OUTPUT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_OUTPUT_SIZE = 250 * 1024 * 1024;

interface PrintRenderPage {
  materialFileId?: string;
  canvas: MaterialTemplateDocumentV2['canvas'];
  layerOrder: string[];
  layers: MaterialTemplateLayerV2[];
  baseBuffer: Buffer;
  baseMimeType: string;
  baseSize: { width: number | null; height: number | null };
}

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

type PdfBox = [number, number, number, number];

function getPrintPageGeometry(preset: PrintPresetSnapshot) {
  const bleedWidthMm =
    preset.trimWidthMm + preset.bleedLeftMm + preset.bleedRightMm;
  const bleedHeightMm =
    preset.trimHeightMm + preset.bleedTopMm + preset.bleedBottomMm;
  const marksMarginMm = preset.includeCropMarks
    ? preset.cropMarkOffsetMm + 6
    : 0;
  const canvasX = marksMarginMm * MM_TO_POINTS;
  const canvasY = marksMarginMm * MM_TO_POINTS;
  const bleedWidthPt = bleedWidthMm * MM_TO_POINTS;
  const bleedHeightPt = bleedHeightMm * MM_TO_POINTS;
  const bleedBox: PdfBox = [
    canvasX,
    canvasY,
    canvasX + bleedWidthPt,
    canvasY + bleedHeightPt,
  ];
  const trimBox: PdfBox = [
    canvasX + preset.bleedLeftMm * MM_TO_POINTS,
    canvasY + preset.bleedBottomMm * MM_TO_POINTS,
    canvasX + (preset.bleedLeftMm + preset.trimWidthMm) * MM_TO_POINTS,
    canvasY + (preset.bleedBottomMm + preset.trimHeightMm) * MM_TO_POINTS,
  ];
  return {
    pageWidth: (bleedWidthMm + marksMarginMm * 2) * MM_TO_POINTS,
    pageHeight: (bleedHeightMm + marksMarginMm * 2) * MM_TO_POINTS,
    canvasX,
    canvasY,
    bleedWidthPt,
    bleedHeightPt,
    bleedBox,
    trimBox,
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
    document: PrintableDocument,
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
            material: {
              select: {
                materialFiles: {
                  orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                  select: {
                    id: true,
                    imageKey: true,
                    mimeType: true,
                    width: true,
                    height: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!exportRecord) {
      throw new InternalServerErrorException('Exportação não encontrada');
    }
    if (document.version === 2 && !exportRecord.template.baseFile) {
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

      const pageSources =
        document.version === 2
          ? [
              {
                canvas: document.canvas,
                layerOrder: document.layerOrder,
                layers: document.layers,
                file: exportRecord.template.baseFile!,
              },
            ]
          : document.pages
              .map((page) => {
                const file = exportRecord.template.material.materialFiles.find(
                  (candidate) => candidate.id === page.materialFileId,
                );
                if (!file) {
                  throw new InternalServerErrorException(
                    `Imagem base da página não encontrada: ${page.materialFileId}`,
                  );
                }
                return {
                  materialFileId: page.materialFileId,
                  canvas: page.canvas,
                  layerOrder: page.layerOrder,
                  layers: page.layers,
                  file,
                };
              })
              .sort(
                (left, right) =>
                  left.file.sortOrder - right.file.sortOrder ||
                  left.file.id.localeCompare(right.file.id),
              );
      const [baseBuffers, iccBuffer] = await Promise.all([
        Promise.all(
          pageSources.map(({ file }) => this.storage.readFile(file.imageKey)),
        ),
        this.storage.readFile(preset.colorProfile.storageKey),
      ]);
      const pages: PrintRenderPage[] = pageSources.map((source, index) => ({
        ...('materialFileId' in source
          ? { materialFileId: source.materialFileId }
          : {}),
        canvas: source.canvas,
        layerOrder: source.layerOrder,
        layers: source.layers,
        baseBuffer: baseBuffers[index],
        baseMimeType: source.file.mimeType,
        baseSize: { width: source.file.width, height: source.file.height },
      }));
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
        pages,
        preset,
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
      await this.applyPageBoxes(outputPath, preset);
      await onProgress(75);
      await this.validateOutput(outputPath, pages.length);
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
    pages: PrintRenderPage[],
    preset: PrintPresetSnapshot,
    assets: Map<string, { mimeType: string; name: string; buffer: Buffer }>,
    images: Map<string, PreparedPrintImage> = new Map(),
  ): Promise<Buffer> {
    const {
      pageWidth,
      pageHeight,
      canvasX,
      canvasY,
      bleedWidthPt,
      bleedHeightPt,
      bleedBox,
      trimBox,
    } = getPrintPageGeometry(preset);

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

    for (const family of Object.keys(PRINT_FONT_FILES)) {
      pdf.registerFont(
        family,
        getPrintFontPath(family as keyof typeof PRINT_FONT_FILES),
      );
    }

    for (const document of pages) {
      const scaleX = bleedWidthPt / document.canvas.width;
      const scaleY = bleedHeightPt / document.canvas.height;
      pdf.addPage({ size: [pageWidth, pageHeight], margin: 0 });
      (pdf.page as any).dictionary.data.BleedBox = bleedBox;
      (pdf.page as any).dictionary.data.TrimBox = trimBox;

      pdf.rect(canvasX, canvasY, bleedWidthPt, bleedHeightPt).fill('#ffffff');

      const probed = readRasterDimensions(
        document.baseBuffer,
        document.baseMimeType,
      );
      const baseWidth =
        document.baseSize.width ?? probed?.width ?? document.canvas.width;
      const baseHeight =
        document.baseSize.height ?? probed?.height ?? document.canvas.height;
      const coverScale = Math.max(
        bleedWidthPt / Math.max(baseWidth, 1),
        bleedHeightPt / Math.max(baseHeight, 1),
      );
      const coveredWidth = baseWidth * coverScale;
      const coveredHeight = baseHeight * coverScale;
      pdf.save();
      pdf.rect(canvasX, canvasY, bleedWidthPt, bleedHeightPt).clip();
      pdf.image(
        document.baseBuffer,
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
          const image = images.get(
            printImageKey(document.materialFileId, layer.id),
          );
          if (!image)
            throw new Error(`Marcador ${layer.id}: imagem obrigatória`);
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
          const requestedFont = resolvePrintFontFamily(
            run.fontFamily,
            run.bold,
          );
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

  private async validateOutput(path: string, expectedPages: number) {
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
    const { objects: pageObjects } = await this.readPageObjects(path);
    if (
      Object.keys(pageObjects).length !== expectedPages ||
      Object.values(pageObjects).some(
        ({ value }) =>
          !Array.isArray(value['/TrimBox']) ||
          !Array.isArray(value['/BleedBox']),
      )
    ) {
      throw new Error('PDF sem caixas de corte e sangria em todas as páginas');
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

  private async readPageObjects(path: string) {
    const { stdout: pagesJson } = await this.run('qpdf', [
      '--json=2',
      '--json-key=pages',
      path,
    ]);
    const { pages } = JSON.parse(pagesJson) as {
      pages: Array<{ object: string }>;
    };
    const { stdout: objectsJson } = await this.run('qpdf', [
      '--json=2',
      '--json-key=qpdf',
      ...pages.map(
        ({ object }) =>
          `--json-object=${object.replace(/\s+R$/, '').replace(/\s+/, ',')}`,
      ),
      path,
    ]);
    const {
      qpdf: [header, objects],
    } = JSON.parse(objectsJson) as {
      qpdf: [
        Record<string, unknown>,
        Record<string, { value: Record<string, unknown> }>,
      ];
    };
    return { header, objects };
  }

  // Ghostscript's PDF/X mode drops input TrimBox/BleedBox and writes an
  // ArtBox equal to the MediaBox, so the boxes are restored afterwards.
  private async applyPageBoxes(path: string, preset: PrintPresetSnapshot) {
    const { bleedBox, trimBox } = getPrintPageGeometry(preset);
    const round = (box: PdfBox) =>
      box.map((value) => Math.round(value * 1000) / 1000);
    const { header, objects } = await this.readPageObjects(path);
    const updates = Object.fromEntries(
      Object.entries(objects).map(([key, { value }]) => {
        const page = { ...value };
        delete page['/ArtBox'];
        return [
          key,
          {
            value: {
              ...page,
              '/BleedBox': round(bleedBox),
              '/TrimBox': round(trimBox),
            },
          },
        ];
      }),
    );
    const updatePath = `${path}.boxes.json`;
    await fs.writeFile(
      updatePath,
      JSON.stringify({ qpdf: [header, updates] }),
      'utf8',
    );
    await this.run('qpdf', [
      path,
      '--replace-input',
      `--update-from-json=${updatePath}`,
    ]);
  }

  private run(command: string, args: string[]) {
    return execFileAsync(command, args, {
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: 5 * 1024 * 1024,
      windowsHide: true,
    });
  }
}
