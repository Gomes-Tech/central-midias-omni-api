import { BadRequestException } from '@common/filters';
import { Injectable } from '@nestjs/common';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_SIDE = 3840;
const MAX_PIXELS = 3840 * 2160;

function readPngDimensions(buffer: Buffer) {
  const signature = '89504e470d0a1a0a';
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString('hex') !== signature
  ) {
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }
  let offset = 2;
  const sofMarkers = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
    0xcf,
  ]);
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) break;
    if (sofMarkers.has(marker)) {
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += length;
  }
  return null;
}

type MaterialTemplateImageInput = Pick<Express.Multer.File, 'buffer' | 'size'>;

export function validateMaterialTemplateImage(
  file: MaterialTemplateImageInput,
): {
  width: number;
  height: number;
  mimeType: 'image/png' | 'image/jpeg';
} {
  if (!file || file.size > MAX_FILE_SIZE) {
    throw new BadRequestException('A imagem base deve ter no máximo 5 MB');
  }
  const png = readPngDimensions(file.buffer);
  const jpeg = png ? null : readJpegDimensions(file.buffer);
  const dimensions = png ?? jpeg;
  const mimeType = png ? 'image/png' : jpeg ? 'image/jpeg' : null;
  if (!dimensions || !mimeType) {
    throw new BadRequestException('A imagem base deve ser PNG ou JPEG válido');
  }
  if (
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    Math.max(dimensions.width, dimensions.height) > MAX_SIDE ||
    dimensions.width * dimensions.height > MAX_PIXELS
  ) {
    throw new BadRequestException(
      'A imagem base excede o limite de resolução permitido',
    );
  }
  return { ...dimensions, mimeType };
}

@Injectable()
export class MaterialTemplateImageService {
  validate(file: MaterialTemplateImageInput) {
    return validateMaterialTemplateImage(file);
  }
}
