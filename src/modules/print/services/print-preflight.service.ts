import { BadRequestException, NotFoundException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { readRasterDimensions } from '@modules/asset/services/asset-file-validation.service';
import type {
  MaterialTemplateCanvas,
  MaterialTemplateDocument,
  MaterialTemplateLayerV2,
  MaterialTemplateTextLayerV2,
} from '@modules/material-template/entities';
import { MaterialTemplateDocumentService } from '@modules/material-template/services/material-template-document.service';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fontkit from 'fontkit';
import type { PrintPreflightIssue, PrintPreflightResult } from '../entities';
import {
  getPrintFontPath,
  isPrintFontFamily,
  resolvePrintFontFamily,
} from './print-fonts';

const templateForPrintInclude = {
  baseFile: true,
  printPreset: {
    include: { colorProfile: true },
  },
  assets: {
    include: { asset: true },
  },
  material: {
    select: {
      materialFiles: {
        select: {
          id: true,
          imageKey: true,
          originalName: true,
          mimeType: true,
          size: true,
          width: true,
          height: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  },
} satisfies Prisma.MaterialTemplateInclude;

type PrintPreflightTemplate = Prisma.MaterialTemplateGetPayload<{
  include: typeof templateForPrintInclude;
}>;

interface PrintPreflightFile {
  id: string;
  imageKey: string;
  size: number;
  width: number | null;
  height: number | null;
}

interface PrintPreflightFileEntry {
  displayName: string;
  file: PrintPreflightFile;
}

/**
 * A single unit checked against the preset. V2 documents expose their one page
 * here, so every downstream rule runs through the same page-driven path.
 */
interface PrintPreflightPage {
  materialFileId?: string;
  displayName: string;
  canvas: MaterialTemplateCanvas;
  layers: MaterialTemplateLayerV2[];
  file: PrintPreflightFile | null;
}

@Injectable()
export class PrintPreflightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    @Inject(forwardRef(() => MaterialTemplateDocumentService))
    private readonly documentService: MaterialTemplateDocumentService,
  ) {}

  async get(materialId: string, organizationId: string) {
    const template = await this.prisma.materialTemplate.findFirst({
      where: { materialId, organizationId },
      include: { printPreflight: true },
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    return template.printPreflight;
  }

  async run(
    materialId: string,
    organizationId: string,
  ): Promise<PrintPreflightResult> {
    const template = await this.prisma.materialTemplate.findFirst({
      where: { materialId, organizationId },
      include: templateForPrintInclude,
    });
    if (!template) throw new NotFoundException('Template não encontrado');
    if (!template.printPreset) {
      throw new BadRequestException(
        'O template não possui preset de impressão',
      );
    }
    if (!template.document || !template.baseFile) {
      throw new BadRequestException('O template não está completo');
    }

    const document = this.documentService.validate(template.document);
    const issues = await this.inspect(template, document);
    const checkedAt = new Date();
    const status = issues.length ? 'FAILED' : 'READY';
    const preflight = await this.prisma.printPreflight.upsert({
      where: { templateId: template.id },
      create: {
        templateId: template.id,
        templateRevision: template.revision,
        presetUpdatedAt: template.printPreset.updatedAt,
        status,
        issues: issues as unknown as Prisma.InputJsonValue,
        checkedAt,
      },
      update: {
        templateRevision: template.revision,
        presetUpdatedAt: template.printPreset.updatedAt,
        status,
        issues: issues as unknown as Prisma.InputJsonValue,
        checkedAt,
      },
    });
    return {
      status: preflight.status,
      issues,
      checkedAt,
      templateRevision: preflight.templateRevision,
      presetUpdatedAt: preflight.presetUpdatedAt,
    };
  }

  async runForPreset(presetId: string) {
    const templates = await this.prisma.materialTemplate.findMany({
      where: { printPresetId: presetId },
      select: { materialId: true, organizationId: true },
    });
    for (const template of templates) {
      await this.run(template.materialId, template.organizationId).catch(
        () => undefined,
      );
    }
  }

  private async inspect(
    template: PrintPreflightTemplate,
    document: MaterialTemplateDocument,
  ): Promise<PrintPreflightIssue[]> {
    const issues: PrintPreflightIssue[] = [];
    if (document.version === 1) {
      issues.push({
        code: 'DOCUMENT_VERSION_UNSUPPORTED',
        message: 'A impressão requer um documento de template V2 ou V3.',
      });
      return issues;
    }
    const preset = template.printPreset!;
    if (!preset.isActive || !preset.colorProfile.isActive) {
      issues.push({
        code: 'PRESET_UNAVAILABLE',
        message: 'O preset ou seu perfil ICC está arquivado.',
      });
    }

    const bleedWidthMm =
      Number(preset.trimWidthMm) +
      Number(preset.bleedLeftMm) +
      Number(preset.bleedRightMm);
    const bleedHeightMm =
      Number(preset.trimHeightMm) +
      Number(preset.bleedTopMm) +
      Number(preset.bleedBottomMm);
    const physicalRatio = bleedWidthMm / bleedHeightMm;

    const filesById = this.filesById(template);
    const assets = new Map(
      template.assets.map(({ asset }) => [asset.id, asset]),
    );

    // Every page is measured against the same preset; a single invalid page
    // fails the whole template.
    for (const page of this.pages(document, template, filesById)) {
      const issue = (candidate: PrintPreflightIssue): PrintPreflightIssue =>
        page.materialFileId
          ? { ...candidate, materialFileId: page.materialFileId }
          : candidate;

      const canvasRatio = page.canvas.width / page.canvas.height;
      if (Math.abs(canvasRatio / physicalRatio - 1) > 0.005) {
        issues.push(
          issue({
            code: 'CANVAS_ASPECT_RATIO',
            message: `${page.displayName}: a proporção do canvas não corresponde à área de sangria.`,
          }),
        );
      }

      if (!page.file) {
        issues.push(
          issue({
            code: 'PAGE_IMAGE_MISSING',
            message: `${page.displayName}: a imagem da página não foi encontrada no material.`,
          }),
        );
      } else {
        const dimensions = await this.resolveFileDimensions(page.file);
        if (dimensions) {
          this.addDpiIssue(
            issues,
            page.displayName,
            dimensions.width,
            dimensions.height,
            bleedWidthMm,
            bleedHeightMm,
            preset.minimumDpi,
            { materialFileId: page.materialFileId },
          );
        } else {
          issues.push(
            issue({
              code: 'PAGE_IMAGE_INVALID',
              message: `${page.displayName}: não foi possível ler as dimensões da imagem.`,
            }),
          );
        }
      }
      // A arte cobre a sangria com crop (cover); proporções diferentes são aceitas.

      for (const layer of page.layers) {
        if (layer.type !== 'asset') continue;
        const asset = assets.get(layer.assetId);
        if (!asset) {
          issues.push(
            issue({
              code: 'ASSET_MISSING',
              message: `${page.displayName}: o asset da camada ${layer.name} não foi encontrado.`,
              layerId: layer.id,
            }),
          );
          continue;
        }
        if (asset.mimeType === 'image/svg+xml') {
          const svg = (await this.storage.readAsset(asset.fileKey)).toString(
            'utf8',
          );
          if (
            /<(?:script|foreignObject|filter|mask|pattern)\b|\b(?:filter|mask)\s*=/i.test(
              svg,
            )
          ) {
            issues.push(
              issue({
                code: 'SVG_INCOMPATIBLE',
                message: `${page.displayName}: ${layer.name} usa recursos SVG incompatíveis com a exportação vetorial.`,
                layerId: layer.id,
              }),
            );
          }
          continue;
        }
        let assetWidth = asset.width;
        let assetHeight = asset.height;
        if (!assetWidth || !assetHeight) {
          const buffer = await this.storage.readAsset(asset.fileKey);
          const dimensions = readRasterDimensions(buffer, asset.mimeType);
          assetWidth = dimensions?.width ?? null;
          assetHeight = dimensions?.height ?? null;
          if (assetWidth && assetHeight) {
            await this.prisma.asset.update({
              where: { id: asset.id },
              data: { width: assetWidth, height: assetHeight },
            });
          } else {
            issues.push(
              issue({
                code: 'ASSET_METADATA_MISSING',
                message: `${page.displayName}: não foi possível determinar a resolução de ${layer.name}.`,
                layerId: layer.id,
              }),
            );
            continue;
          }
        }
        this.addDpiIssue(
          issues,
          `${page.displayName}: ${layer.name}`,
          assetWidth,
          assetHeight,
          (layer.width / page.canvas.width) * bleedWidthMm,
          (layer.height / page.canvas.height) * bleedHeightMm,
          preset.minimumDpi,
          { layerId: layer.id, materialFileId: page.materialFileId },
        );
      }

      const safeLeft =
        ((Number(preset.bleedLeftMm) + Number(preset.safeMarginLeftMm)) /
          bleedWidthMm) *
        page.canvas.width;
      const safeTop =
        ((Number(preset.bleedTopMm) + Number(preset.safeMarginTopMm)) /
          bleedHeightMm) *
        page.canvas.height;
      const safeRight =
        page.canvas.width -
        ((Number(preset.bleedRightMm) + Number(preset.safeMarginRightMm)) /
          bleedWidthMm) *
          page.canvas.width;
      const safeBottom =
        page.canvas.height -
        ((Number(preset.bleedBottomMm) + Number(preset.safeMarginBottomMm)) /
          bleedHeightMm) *
          page.canvas.height;
      for (const layer of page.layers) {
        if (layer.type !== 'text') continue;
        if (layer.runs.some((run) => !isPrintFontFamily(run.fontFamily))) {
          issues.push(
            issue({
              code: 'FONT_UNSUPPORTED',
              message: `${page.displayName}: ${layer.name} usa uma fonte não autorizada para impressão.`,
              layerId: layer.id,
            }),
          );
          continue;
        }
        const bounds = this.getTextBounds(layer);
        if (
          bounds.left < safeLeft ||
          bounds.top < safeTop ||
          bounds.right > safeRight ||
          bounds.bottom > safeBottom
        ) {
          issues.push(
            issue({
              code: 'TEXT_OUTSIDE_SAFE_AREA',
              message: `${page.displayName}: ${layer.name} ultrapassa a área segura.`,
              layerId: layer.id,
            }),
          );
        }
      }
    }
    return issues;
  }

  private filesById(
    template: PrintPreflightTemplate,
  ): Map<string, PrintPreflightFileEntry> {
    const files = template.material.materialFiles;
    return new Map(
      files.map((file, index) => [
        file.id,
        {
          file,
          // Mirrors the display name rule used by the template response.
          displayName: file.originalName ?? `Imagem ${index + 1}`,
        },
      ]),
    );
  }

  private pages(
    document: Exclude<MaterialTemplateDocument, { version: 1 }>,
    template: PrintPreflightTemplate,
    filesById: Map<string, PrintPreflightFileEntry>,
  ): PrintPreflightPage[] {
    if (document.version === 3) {
      return document.pages.map((page) => {
        const resolved = filesById.get(page.materialFileId);
        return {
          materialFileId: page.materialFileId,
          displayName: resolved?.displayName ?? page.materialFileId,
          canvas: page.canvas,
          layers: page.layers,
          file: resolved?.file ?? null,
        };
      });
    }
    const file = template.baseFile!;
    const resolved = filesById.get(file.id);
    return [
      {
        materialFileId: template.baseMaterialFileId ?? file.id,
        displayName: resolved?.displayName ?? file.originalName ?? 'Imagem 1',
        canvas: document.canvas,
        layers: document.layers,
        file,
      },
    ];
  }

  private async resolveFileDimensions(
    file: PrintPreflightFile,
  ): Promise<{ width: number; height: number } | null> {
    if (file.width && file.height) {
      return { width: file.width, height: file.height };
    }
    try {
      const buffer = await this.storage.readFile(file.imageKey);
      const metadata = validateMaterialTemplateImage({
        buffer,
        size: file.size,
      });
      await this.prisma.materialFile.update({
        where: { id: file.id },
        data: { width: metadata.width, height: metadata.height },
      });
      return { width: metadata.width, height: metadata.height };
    } catch {
      return null;
    }
  }

  private getTextBounds(layer: MaterialTemplateTextLayerV2) {
    let x = 0;
    let lineHeight = 0;
    let width = 0;
    let height = 0;
    for (const run of layer.runs) {
      const family = resolvePrintFontFamily(run.fontFamily, run.bold);
      const font = fontkit.openSync(getPrintFontPath(family)) as fontkit.Font;
      const pieces = run.text.split('\n');
      pieces.forEach((piece, index) => {
        const advance =
          (font.layout(piece).advanceWidth / font.unitsPerEm) * run.fontSize;
        x += advance + (run.italic ? run.fontSize * 0.212 : 0);
        width = Math.max(width, x);
        lineHeight = Math.max(lineHeight, run.fontSize * 1.2);
        if (index < pieces.length - 1) {
          height += lineHeight;
          x = 0;
          lineHeight = 0;
        }
      });
    }
    height += lineHeight;
    const radians = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const corners = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ].map(([cornerX, cornerY]) => ({
      x: layer.x + cornerX * cos - cornerY * sin,
      y: layer.y + cornerX * sin + cornerY * cos,
    }));
    return {
      left: Math.min(...corners.map((point) => point.x)),
      top: Math.min(...corners.map((point) => point.y)),
      right: Math.max(...corners.map((point) => point.x)),
      bottom: Math.max(...corners.map((point) => point.y)),
    };
  }

  private addDpiIssue(
    issues: PrintPreflightIssue[],
    label: string,
    widthPx: number,
    heightPx: number,
    widthMm: number,
    heightMm: number,
    minimumDpi: number,
    context: { layerId?: string; materialFileId?: string } = {},
  ) {
    const dpi = Math.min(
      widthPx / (widthMm / 25.4),
      heightPx / (heightMm / 25.4),
    );
    if (dpi + 0.5 < minimumDpi) {
      issues.push({
        code: 'LOW_EFFECTIVE_DPI',
        message: `${label} possui ${Math.floor(dpi)} DPI efetivos; o mínimo é ${minimumDpi}.`,
        ...(context.layerId ? { layerId: context.layerId } : {}),
        ...(context.materialFileId
          ? { materialFileId: context.materialFileId }
          : {}),
      });
    }
  }
}
