import { BadRequestException, NotFoundException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { readRasterDimensions } from '@modules/asset/services/asset-file-validation.service';
import {
  MaterialTemplateDocument,
  MaterialTemplateDocumentService,
  MaterialTemplateTextLayerV2,
} from '@modules/material-template';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Injectable } from '@nestjs/common';
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
} satisfies Prisma.MaterialTemplateInclude;

@Injectable()
export class PrintPreflightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
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
    template: Prisma.MaterialTemplateGetPayload<{
      include: typeof templateForPrintInclude;
    }>,
    document: MaterialTemplateDocument,
  ) {
    const issues: PrintPreflightIssue[] = [];
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
    const canvasRatio = document.canvas.width / document.canvas.height;
    const physicalRatio = bleedWidthMm / bleedHeightMm;
    if (Math.abs(canvasRatio / physicalRatio - 1) > 0.005) {
      issues.push({
        code: 'CANVAS_ASPECT_RATIO',
        message: 'A proporção do canvas não corresponde à área de sangria.',
      });
    }

    let baseWidth = template.baseFile!.width;
    let baseHeight = template.baseFile!.height;
    if (!baseWidth || !baseHeight) {
      const buffer = await this.storage.readFile(template.baseFile!.imageKey);
      const metadata = validateMaterialTemplateImage({
        buffer,
        size: template.baseFile!.size,
      });
      baseWidth = metadata.width;
      baseHeight = metadata.height;
      await this.prisma.materialFile.update({
        where: { id: template.baseFile!.id },
        data: { width: baseWidth, height: baseHeight },
      });
    }
    this.addDpiIssue(
      issues,
      'Imagem base',
      baseWidth,
      baseHeight,
      bleedWidthMm,
      bleedHeightMm,
      preset.minimumDpi,
    );
    const baseRatio = baseWidth / baseHeight;
    if (Math.abs(baseRatio / canvasRatio - 1) > 0.005) {
      issues.push({
        code: 'BASE_DOES_NOT_COVER_BLEED',
        message:
          'A imagem base não cobre a sangria sem distorção ou áreas vazias.',
      });
    }

    const assets = new Map(
      template.assets.map(({ asset }) => [asset.id, asset]),
    );
    for (const layer of document.layers) {
      if (layer.type !== 'asset') continue;
      const asset = assets.get(layer.assetId);
      if (!asset) {
        issues.push({
          code: 'ASSET_MISSING',
          message: `O asset da camada ${layer.name} não foi encontrado.`,
          layerId: layer.id,
        });
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
          issues.push({
            code: 'SVG_INCOMPATIBLE',
            message: `${layer.name} usa recursos SVG incompatíveis com a exportação vetorial.`,
            layerId: layer.id,
          });
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
          issues.push({
            code: 'ASSET_METADATA_MISSING',
            message: `Não foi possível determinar a resolução de ${layer.name}.`,
            layerId: layer.id,
          });
          continue;
        }
      }
      this.addDpiIssue(
        issues,
        layer.name,
        assetWidth,
        assetHeight,
        (layer.width / document.canvas.width) * bleedWidthMm,
        (layer.height / document.canvas.height) * bleedHeightMm,
        preset.minimumDpi,
        layer.id,
      );
    }

    const safeLeft =
      ((Number(preset.bleedLeftMm) + Number(preset.safeMarginLeftMm)) /
        bleedWidthMm) *
      document.canvas.width;
    const safeTop =
      ((Number(preset.bleedTopMm) + Number(preset.safeMarginTopMm)) /
        bleedHeightMm) *
      document.canvas.height;
    const safeRight =
      document.canvas.width -
      ((Number(preset.bleedRightMm) + Number(preset.safeMarginRightMm)) /
        bleedWidthMm) *
        document.canvas.width;
    const safeBottom =
      document.canvas.height -
      ((Number(preset.bleedBottomMm) + Number(preset.safeMarginBottomMm)) /
        bleedHeightMm) *
        document.canvas.height;
    if (document.version !== 2) {
      issues.push({
        code: 'DOCUMENT_VERSION_UNSUPPORTED',
        message: 'A impressão requer um documento de template V2.',
      });
      return issues;
    }
    for (const layer of document.layers) {
      if (layer.type !== 'text') continue;
      if (layer.runs.some((run) => !isPrintFontFamily(run.fontFamily))) {
        issues.push({
          code: 'FONT_UNSUPPORTED',
          message: `${layer.name} usa uma fonte não autorizada para impressão.`,
          layerId: layer.id,
        });
        continue;
      }
      const bounds = this.getTextBounds(layer);
      if (
        bounds.left < safeLeft ||
        bounds.top < safeTop ||
        bounds.right > safeRight ||
        bounds.bottom > safeBottom
      ) {
        issues.push({
          code: 'TEXT_OUTSIDE_SAFE_AREA',
          message: `${layer.name} ultrapassa a área segura.`,
          layerId: layer.id,
        });
      }
    }
    return issues;
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
    layerId?: string,
  ) {
    const dpi = Math.min(
      widthPx / (widthMm / 25.4),
      heightPx / (heightMm / 25.4),
    );
    if (dpi + 0.5 < minimumDpi) {
      issues.push({
        code: 'LOW_EFFECTIVE_DPI',
        message: `${label} possui ${Math.floor(dpi)} DPI efetivos; o mínimo é ${minimumDpi}.`,
        ...(layerId && { layerId }),
      });
    }
  }
}
