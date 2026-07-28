import { BadRequestException } from '@common/filters';
import { sanitizeInput } from '@common/utils';
import { Injectable } from '@nestjs/common';
import { extname, posix } from 'node:path';
import sanitizeHtml from 'sanitize-html';

export interface PreparedAssetFile {
  buffer: Buffer;
  extension: 'png' | 'jpg' | 'jpeg' | 'svg';
  mimeType: 'image/png' | 'image/jpeg' | 'image/svg+xml';
  size: number;
  defaultName: string;
}

const SVG_ALLOWED_TAGS = [
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'symbol',
  'use',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'marker',
  'title',
  'desc',
];

const SVG_ALLOWED_ATTRIBUTES = [
  'id',
  'class',
  'xmlns',
  'xmlns:xlink',
  'viewBox',
  'preserveAspectRatio',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'x2',
  'y1',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'd',
  'points',
  'transform',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-dasharray',
  'stroke-dashoffset',
  'opacity',
  'clip-path',
  'clip-rule',
  'mask',
  'filter',
  'vector-effect',
  'paint-order',
  'font-family',
  'font-size',
  'font-weight',
  'text-anchor',
  'dominant-baseline',
  'dx',
  'dy',
  'offset',
  'stop-color',
  'stop-opacity',
  'gradientUnits',
  'gradientTransform',
  'spreadMethod',
  'patternUnits',
  'patternContentUnits',
  'patternTransform',
  'markerWidth',
  'markerHeight',
  'markerUnits',
  'orient',
  'refX',
  'refY',
  'href',
  'xlink:href',
];

@Injectable()
export class AssetFileValidationService {
  prepare(file: Express.Multer.File): PreparedAssetFile {
    if (!file?.buffer?.length) {
      throw new BadRequestException('O arquivo do asset está vazio');
    }

    const originalName = this.normalizeOriginalName(file.originalname || '');
    const extension = extname(originalName)
      .toLowerCase()
      .replace(/^\./, '') as PreparedAssetFile['extension'];
    const mimeType = (file.mimetype || '').toLowerCase().trim();

    if (!['png', 'jpg', 'jpeg', 'svg'].includes(extension)) {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" possui extensão inválida`,
      );
    }

    const defaultName = this.defaultName(originalName, extension);

    if (extension === 'png') {
      if (mimeType !== 'image/png' || !this.isPng(file.buffer)) {
        throw new BadRequestException(
          `Arquivo "${file.originalname}" não é um PNG válido`,
        );
      }
      return this.prepared(file.buffer, extension, 'image/png', defaultName);
    }

    if (extension === 'jpg' || extension === 'jpeg') {
      if (
        !['image/jpeg', 'image/jpg'].includes(mimeType) ||
        !this.isJpeg(file.buffer)
      ) {
        throw new BadRequestException(
          `Arquivo "${file.originalname}" não é um JPEG válido`,
        );
      }
      return this.prepared(file.buffer, extension, 'image/jpeg', defaultName);
    }

    if (mimeType !== 'image/svg+xml') {
      throw new BadRequestException(
        `Arquivo "${file.originalname}" não é um SVG válido`,
      );
    }

    const sanitizedBuffer = this.sanitizeSvg(file.buffer, file.originalname);
    return this.prepared(sanitizedBuffer, 'svg', 'image/svg+xml', defaultName);
  }

  private prepared(
    buffer: Buffer,
    extension: PreparedAssetFile['extension'],
    mimeType: PreparedAssetFile['mimeType'],
    defaultName: string,
  ): PreparedAssetFile {
    return { buffer, extension, mimeType, size: buffer.length, defaultName };
  }

  private defaultName(originalName: string, extension: string): string {
    const normalized = (originalName || '').replace(/\\/g, '/');
    const baseName = posix.basename(normalized, `.${extension}`);
    return sanitizeInput(baseName).slice(0, 150) || 'asset';
  }

  private normalizeOriginalName(originalName: string): string {
    const decoded = Buffer.from(originalName, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? originalName : decoded;
  }

  private isPng(buffer: Buffer): boolean {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    return (
      buffer.length >= 20 &&
      buffer.subarray(0, 8).equals(signature) &&
      buffer
        .subarray(buffer.length - 8, buffer.length - 4)
        .toString('ascii') === 'IEND'
    );
  }

  private isJpeg(buffer: Buffer): boolean {
    return (
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff &&
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9
    );
  }

  private sanitizeSvg(buffer: Buffer, originalName: string): Buffer {
    const source = buffer
      .toString('utf8')
      .replace(/^\uFEFF/, '')
      .trim()
      .replace(/^<\?xml[\s\S]*?\?>\s*/i, '');

    if (!/^<svg(?:\s|>)/.test(source) || source.includes('\u0000')) {
      throw new BadRequestException(
        `Arquivo "${originalName}" não é um SVG válido`,
      );
    }

    const sanitized = sanitizeHtml(source, {
      allowedTags: SVG_ALLOWED_TAGS,
      allowedAttributes: { '*': SVG_ALLOWED_ATTRIBUTES },
      allowedSchemes: [],
      allowProtocolRelative: false,
      nonTextTags: [
        'style',
        'script',
        'textarea',
        'option',
        'noscript',
        'foreignObject',
        'iframe',
        'object',
        'embed',
      ],
      parser: {
        lowerCaseTags: false,
        lowerCaseAttributeNames: false,
      },
      transformTags: {
        '*': (tagName, attributes) => ({
          tagName,
          attribs: this.sanitizeSvgAttributes(attributes),
        }),
      },
    }).trim();

    if (!/^<svg(?:\s|>)/.test(sanitized) || !/<\/svg>\s*$/.test(sanitized)) {
      throw new BadRequestException(
        `Arquivo "${originalName}" ficou inválido após a sanitização`,
      );
    }

    return Buffer.from(sanitized, 'utf8');
  }

  private sanitizeSvgAttributes(
    attributes: Record<string, string>,
  ): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [name, value] of Object.entries(attributes)) {
      const normalizedName = name.toLowerCase();
      const normalizedValue = value.trim();

      if (normalizedName.startsWith('on') || normalizedName === 'style') {
        continue;
      }

      if (
        ['href', 'xlink:href'].includes(normalizedName) &&
        !normalizedValue.startsWith('#')
      ) {
        continue;
      }

      if (/url\s*\(/i.test(normalizedValue)) {
        const references = [...normalizedValue.matchAll(/url\s*\(([^)]+)\)/gi)];
        const onlyLocalReferences = references.every((match) =>
          match[1]
            .trim()
            .replace(/^['"]|['"]$/g, '')
            .startsWith('#'),
        );
        if (!onlyLocalReferences) {
          continue;
        }
      }

      if (/javascript:|data:|https?:|^\/\//i.test(normalizedValue)) {
        continue;
      }

      sanitized[name] = value;
    }

    return sanitized;
  }
}
