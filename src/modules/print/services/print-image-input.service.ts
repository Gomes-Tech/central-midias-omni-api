import {
  MAX_IMAGE_PLACEHOLDERS,
  PRINT_IMAGE_MAX_BYTES,
  PRINT_INPUT_TTL_MS,
  PRINT_IMAGE_MAX_SIDE,
  PRINT_IMAGE_MAX_PIXELS,
} from '@common/constants/print-image-limits';
import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import type {
  MaterialTemplateCanvas,
  MaterialTemplateImagePlaceholderLayer,
  MaterialTemplateLayerV2,
} from '@modules/material-template';
import { validateMaterialTemplateImage } from '@modules/material-template/services/material-template-image.service';
import { Injectable, PayloadTooLargeException } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import PDFDocument from 'pdfkit';
import type { PrintImageBindingDTO } from '../dto/create-print-export.dto';
import type { PrintPresetSnapshot } from '../entities';
import type { PrintableDocument } from './print-document.service';

export interface PreparedPrintImage {
  materialFileId?: string;
  layerId: string;
  buffer: Buffer;
  checksum: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  fit: 'cover' | 'contain';
  positionX: number;
  positionY: number;
  zoom: number;
}

interface PrintImagePage {
  materialFileId?: string;
  canvas: MaterialTemplateCanvas;
  layers: MaterialTemplateLayerV2[];
}

/**
 * Composite key for a photo binding. V2 documents keep the bare `layerId` so
 * existing maps and hashes stay stable; V3 prefixes the page identity so the
 * same layer id on different pages cannot collide.
 */
export function printImageKey(
  materialFileId: string | undefined,
  layerId: string,
): string {
  return materialFileId === undefined
    ? layerId
    : `${materialFileId}\u0000${layerId}`;
}

function bindingLabel(materialFileId: string | undefined, layerId: string) {
  return materialFileId === undefined
    ? layerId
    : `${materialFileId}/${layerId}`;
}

// PDFKit's parser also provides EXIF orientation and PNG scanline metadata.
interface ParsedImage {
  width: number;
  height: number;
  orientation?: number;
  colorSpace?: string;
  imgData?: Uint8Array;
  image?: { pixelBitlength: number; interlaceMethod: number };
}

function roundPlacementValue(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

@Injectable()
export class PrintImageInputService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  prepare(
    document: PrintableDocument,
    bindings: PrintImageBindingDTO[] = [],
    files: Express.Multer.File[] = [],
  ): PreparedPrintImage[] {
    const placeholders = this.visiblePlaceholders(document);
    const visibleKeys = new Set(
      placeholders.map(({ materialFileId, layer }) =>
        printImageKey(materialFileId, layer.id),
      ),
    );
    if (
      files.length > MAX_IMAGE_PLACEHOLDERS ||
      bindings.length > MAX_IMAGE_PLACEHOLDERS
    ) {
      throw new BadRequestException('Envie até 20 imagens para impressão');
    }
    const filesByField = new Map<string, Express.Multer.File>();
    for (const file of files) {
      if (filesByField.has(file.fieldname)) {
        throw new BadRequestException(
          `Arquivo duplicado no campo ${file.fieldname}`,
        );
      }
      filesByField.set(file.fieldname, file);
    }
    const seenBindings = new Set<string>();
    const seenFields = new Set<string>();
    for (const binding of bindings) {
      if (!binding) {
        throw new BadRequestException('Marcador : associação não permitida');
      }
      const key = printImageKey(binding.materialFileId, binding.layerId);
      const label = bindingLabel(binding.materialFileId, binding.layerId);
      if (!visibleKeys.has(key)) {
        throw new BadRequestException(
          `Marcador ${label}: associação não permitida`,
        );
      }
      if (seenBindings.has(key) || seenFields.has(binding.fileField)) {
        throw new BadRequestException(
          `Marcador ${label}: associação duplicada`,
        );
      }
      if (!filesByField.has(binding.fileField)) {
        throw new BadRequestException(`Marcador ${label}: imagem obrigatória`);
      }
      seenBindings.add(key);
      seenFields.add(binding.fileField);
    }
    const missing = placeholders.filter(
      ({ materialFileId, layer }) =>
        !seenBindings.has(printImageKey(materialFileId, layer.id)),
    );
    if (missing.length) {
      throw new BadRequestException(
        `Imagens obrigatórias nos marcadores: ${missing
          .map(({ materialFileId, layer }) =>
            bindingLabel(materialFileId, layer.id),
          )
          .join(', ')}`,
      );
    }
    if (seenFields.size !== files.length) {
      throw new BadRequestException('Há arquivos sem associação a um marcador');
    }
    return bindings.map(
      ({
        materialFileId,
        layerId,
        fileField,
        fit = 'cover',
        positionX = 0.5,
        positionY = 0.5,
        zoom = 1,
      }) => {
        const file = filesByField.get(fileField)!;
        const label = bindingLabel(materialFileId, layerId);
        if (
          (fit !== 'cover' && fit !== 'contain') ||
          !Number.isFinite(positionX) ||
          positionX < 0 ||
          positionX > 1 ||
          !Number.isFinite(positionY) ||
          positionY < 0 ||
          positionY > 1 ||
          !Number.isFinite(zoom) ||
          zoom < 1 ||
          zoom > 3
        ) {
          throw new BadRequestException(
            `Marcador ${label}: enquadramento inválido`,
          );
        }
        if (
          file.size > PRINT_IMAGE_MAX_BYTES ||
          file.buffer?.length > PRINT_IMAGE_MAX_BYTES
        ) {
          throw new PayloadTooLargeException(
            `Marcador ${label}: imagem deve ter até 5 MiB`,
          );
        }
        try {
          if (!file.buffer?.length || file.size !== file.buffer.length)
            throw new Error();
          const metadata = validateMaterialTemplateImage(file);
          const mime =
            file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype;
          if (mime !== metadata.mimeType) throw new Error();
          const dimensions = this.inspectImage(file.buffer, metadata.mimeType);
          return {
            ...(materialFileId === undefined ? {} : { materialFileId }),
            layerId,
            buffer: file.buffer,
            size: file.buffer.length,
            mimeType: metadata.mimeType,
            fit,
            positionX: roundPlacementValue(positionX),
            positionY: roundPlacementValue(positionY),
            zoom: roundPlacementValue(zoom),
            ...dimensions,
            checksum: createHash('sha256').update(file.buffer).digest('hex'),
          };
        } catch {
          throw new BadRequestException(
            `Marcador ${label}: PNG/JPEG inválido ou acima de 6000 px por lado e 30 megapixels`,
          );
        }
      },
    );
  }

  validateDpi(
    document: PrintableDocument,
    images: PreparedPrintImage[],
    preset: PrintPresetSnapshot,
  ) {
    const bleedWidth =
      preset.trimWidthMm + preset.bleedLeftMm + preset.bleedRightMm;
    const bleedHeight =
      preset.trimHeightMm + preset.bleedTopMm + preset.bleedBottomMm;
    for (const image of images) {
      const placeholder = this.findPlaceholder(
        document,
        image.materialFileId,
        image.layerId,
      );
      if (!placeholder) throw new BadRequestException('Marcador inválido');
      const { layer, canvas } = placeholder;
      const widthInches = ((layer.width / canvas.width) * bleedWidth) / 25.4;
      const heightInches =
        ((layer.height / canvas.height) * bleedHeight) / 25.4;
      const dpiByWidth = image.width / widthInches;
      const dpiByHeight = image.height / heightInches;
      const dpi =
        (image.fit === 'contain'
          ? Math.max(dpiByWidth, dpiByHeight)
          : Math.min(dpiByWidth, dpiByHeight)) / image.zoom;
      if (dpi + 0.01 < preset.minimumDpi) {
        throw new BadRequestException(
          `Marcador ${bindingLabel(image.materialFileId, layer.id)}: resolução de ${Math.floor(dpi)} DPI; mínimo de ${preset.minimumDpi} DPI`,
        );
      }
    }
  }

  async stage(
    owner: { id: string; organizationId: string; userId: string },
    images: PreparedPrintImage[],
  ): Promise<string[]> {
    if (!images.length) return [];
    const records = images.map((image) => {
      const id = randomUUID();
      return {
        materialFileId: image.materialFileId ?? null,
        layerId: image.layerId,
        checksum: image.checksum,
        mimeType: image.mimeType,
        size: image.size,
        width: image.width,
        height: image.height,
        fitMode: image.fit,
        positionX: image.positionX,
        positionY: image.positionY,
        zoom: image.zoom,
        id,
        exportId: owner.id,
        organizationId: owner.organizationId,
        userId: owner.userId,
        storageKey: `print-export-inputs/${owner.organizationId}/${owner.id}/${id}.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`,
        expiresAt: new Date(Date.now() + PRINT_INPUT_TTL_MS),
      };
    });
    await this.prisma.printExportInput.createMany({ data: records });
    const ids = records.map((record) => record.id);
    try {
      // Sequential writes keep memory and partial-upload cleanup bounded.
      for (let i = 0; i < records.length; i++) {
        await this.storage.writePrivateFile({
          path: records[i].storageKey,
          buffer: images[i].buffer,
          mimeType: records[i].mimeType,
        });
      }
      return ids;
    } catch (error) {
      await this.cleanup(ids);
      throw error;
    }
  }

  async load(
    owner: { id: string; organizationId: string; userId: string },
    document: PrintableDocument,
    inputIds: string[] = [],
  ) {
    const rows = inputIds.length
      ? await this.prisma.printExportInput.findMany({
          where: {
            id: { in: inputIds },
            exportId: owner.id,
            organizationId: owner.organizationId,
            userId: owner.userId,
            expiresAt: { gt: new Date() },
          },
        })
      : [];
    if (
      new Set(inputIds).size !== inputIds.length ||
      rows.length !== inputIds.length
    ) {
      throw new BadRequestException(
        'Imagens temporárias ausentes ou expiradas',
      );
    }
    const files: Express.Multer.File[] = [];
    for (const row of rows) {
      const buffer = await this.storage.readFile(row.storageKey);
      if (
        buffer.length !== row.size ||
        createHash('sha256').update(buffer).digest('hex') !== row.checksum
      ) {
        throw new BadRequestException(
          `Marcador ${bindingLabel(row.materialFileId ?? undefined, row.layerId)}: imagem temporária inconsistente`,
        );
      }
      files.push({
        fieldname: row.id,
        mimetype: row.mimeType,
        size: row.size,
        buffer,
      } as Express.Multer.File);
    }
    const prepared = this.prepare(
      document,
      rows.map((row) => ({
        materialFileId: row.materialFileId ?? undefined,
        layerId: row.layerId,
        fileField: row.id,
        fit: row.fitMode as 'cover' | 'contain',
        positionX: row.positionX,
        positionY: row.positionY,
        zoom: row.zoom,
      })),
      files,
    );
    return new Map(
      prepared.map((image) => [
        printImageKey(image.materialFileId, image.layerId),
        image,
      ]),
    );
  }

  private pages(document: PrintableDocument): PrintImagePage[] {
    return document.version === 3
      ? document.pages
      : [{ canvas: document.canvas, layers: document.layers }];
  }

  private visiblePlaceholders(document: PrintableDocument) {
    return this.pages(document).flatMap((page) =>
      page.layers
        .filter(
          (layer): layer is MaterialTemplateImagePlaceholderLayer =>
            layer.type === 'image-placeholder' && layer.isVisible,
        )
        .map((layer) => ({ materialFileId: page.materialFileId, layer })),
    );
  }

  private findPlaceholder(
    document: PrintableDocument,
    materialFileId: string | undefined,
    layerId: string,
  ) {
    for (const page of this.pages(document)) {
      if ((page.materialFileId ?? undefined) !== materialFileId) continue;
      const layer = page.layers.find((candidate) => candidate.id === layerId);
      if (layer?.type === 'image-placeholder') {
        return { layer, canvas: page.canvas };
      }
    }
    return null;
  }

  async cleanup(ids: string[]) {
    if (!ids.length) return;
    // A failed delete retains its tracking row for the hourly sweep.
    try {
      await this.prisma.printExportInput.updateMany({
        where: { id: { in: ids } },
        data: { expiresAt: new Date() },
      });
      const rows = await this.prisma.printExportInput.findMany({
        where: { id: { in: ids } },
      });
      for (const row of rows) {
        try {
          await this.storage.deleteFile([row.storageKey]);
          await this.prisma.printExportInput.deleteMany({
            where: { id: row.id },
          });
        } catch {
          /* retain the row until deletion succeeds */
        }
      }
    } catch {
      /* the original TTL still guarantees a later cleanup attempt */
    }
  }

  async expireInputs(now = new Date()) {
    let after: string | undefined;
    let count = 0;
    for (;;) {
      const rows = await this.prisma.printExportInput.findMany({
        where: {
          expiresAt: { lte: now },
          ...(after ? { id: { gt: after } } : {}),
        },
        orderBy: { id: 'asc' },
        take: 100,
        select: { id: true },
      });
      await this.cleanup(rows.map((row) => row.id));
      count += rows.length;
      if (rows.length < 100) return count;
      after = rows[rows.length - 1].id;
    }
  }

  private inspectImage(buffer: Buffer, mimeType: string) {
    if (mimeType === 'image/png') {
      let offset = 8;
      let headers = 0;
      while (offset < buffer.length) {
        if (offset + 12 > buffer.length) throw new Error();
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        if (length > buffer.length - offset - 12) throw new Error();
        if (
          type === 'IHDR' &&
          (++headers !== 1 || length !== 13 || offset !== 8)
        )
          throw new Error();
        if (type === 'IHDR') {
          const depths: Record<number, number[]> = {
            0: [1, 2, 4, 8, 16],
            2: [8, 16],
            3: [1, 2, 4, 8],
            4: [8, 16],
            6: [8, 16],
          };
          if (
            !depths[buffer[25]]?.includes(buffer[24]) ||
            buffer[26] !== 0 ||
            buffer[27] !== 0 ||
            buffer[28] > 1
          )
            throw new Error();
        }
        offset += length + 12;
        if (type === 'IEND' && (offset !== buffer.length || length !== 0))
          throw new Error();
      }
      if (headers !== 1) throw new Error();
    }
    const probe = new PDFDocument({ autoFirstPage: false });
    try {
      const parsed = (
        probe as unknown as { openImage(buffer: Buffer): ParsedImage }
      ).openImage(buffer);
      if (
        !Number.isInteger(parsed.width) ||
        !Number.isInteger(parsed.height) ||
        parsed.width <= 0 ||
        parsed.height <= 0 ||
        Math.max(parsed.width, parsed.height) > PRINT_IMAGE_MAX_SIDE ||
        parsed.width * parsed.height > PRINT_IMAGE_MAX_PIXELS
      )
        throw new Error();
      if (mimeType === 'image/png') {
        if (
          !buffer
            .subarray(-12)
            .equals(Buffer.from('0000000049454e44ae426082', 'hex')) ||
          !parsed.imgData?.length
        )
          throw new Error();
        const bits = parsed.image!.pixelBitlength;
        const passes =
          parsed.image!.interlaceMethod === 1
            ? [
                [0, 0, 8, 8],
                [4, 0, 8, 8],
                [0, 4, 4, 8],
                [2, 0, 4, 4],
                [0, 2, 2, 4],
                [1, 0, 2, 2],
                [0, 1, 1, 2],
              ]
            : [[0, 0, 1, 1]];
        const scanlines = passes.map(([x, y, dx, dy]) => {
          const width = Math.max(0, Math.ceil((parsed.width - x) / dx));
          const height = Math.max(0, Math.ceil((parsed.height - y) / dy));
          return {
            bytes: Math.ceil((width * bits) / 8),
            rows: width ? height : 0,
          };
        });
        const expected = scanlines.reduce(
          (sum, pass) => sum + (pass.bytes + 1) * pass.rows,
          0,
        );
        const pixels = inflateSync(Buffer.from(parsed.imgData), {
          maxOutputLength: expected + 1,
        });
        if (pixels.length !== expected) throw new Error();
        let offset = 0;
        for (const pass of scanlines) {
          for (let row = 0; row < pass.rows; row++) {
            if (pixels[offset] > 4) throw new Error();
            offset += pass.bytes + 1;
          }
        }
      } else if (
        !parsed.colorSpace ||
        buffer.lastIndexOf(Buffer.from([0xff, 0xd9])) <=
          buffer.indexOf(Buffer.from([0xff, 0xda])) ||
        buffer.indexOf(Buffer.from([0xff, 0xda])) < 0
      ) {
        throw new Error();
      }
      return (parsed.orientation ?? 1) > 4
        ? { width: parsed.height, height: parsed.width }
        : { width: parsed.width, height: parsed.height };
    } finally {
      probe.destroy();
    }
  }
}
