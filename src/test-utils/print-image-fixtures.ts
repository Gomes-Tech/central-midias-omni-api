import { deflateSync } from 'node:zlib';
import type {
  MaterialTemplateDocumentV2,
  MaterialTemplateImagePlaceholderLayer,
} from '@modules/material-template/entities';
import type { PrintPresetSnapshot } from '@modules/print/entities';

function chunk(type: string, data: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const header = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, payload, checksum]);
}

export function printPng(
  width = 100,
  height = 100,
  color: (x: number, y: number) => number[] = () => [220, 30, 40],
): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  const channels = color(0, 0).length;
  ihdr[9] = channels === 4 ? 6 : 2;
  const pixels = Buffer.alloc(height * (1 + width * channels));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = y * (1 + width * channels) + 1 + x * channels;
      pixels.set(color(x, y), offset);
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export const placeholder: MaterialTemplateImagePlaceholderLayer = {
  id: 'photo',
  type: 'image-placeholder',
  name: 'Foto do agente',
  x: 100,
  y: 100,
  width: 100,
  height: 100,
  rotation: 0,
  isVisible: true,
  editableProperties: ['image'],
};
export const placeholderDocument: MaterialTemplateDocumentV2 = {
  version: 2,
  canvas: { width: 1000, height: 1000 },
  layers: [placeholder],
  layerOrder: [placeholder.id],
};
export const printImagePreset: PrintPresetSnapshot = {
  id: 'preset',
  name: 'Teste',
  trimWidthMm: 100,
  trimHeightMm: 100,
  bleedTopMm: 0,
  bleedRightMm: 0,
  bleedBottomMm: 0,
  bleedLeftMm: 0,
  safeMarginTopMm: 0,
  safeMarginRightMm: 0,
  safeMarginBottomMm: 0,
  safeMarginLeftMm: 0,
  minimumDpi: 72,
  includeCropMarks: false,
  cropMarkOffsetMm: 0,
  renderingIntent: 'RELATIVE_COLORIMETRIC',
  updatedAt: new Date(0).toISOString(),
  colorProfile: {
    id: 'icc',
    name: 'CMYK',
    storageKey: 'icc',
    checksum: 'hash',
    outputConditionIdentifier: 'Default CMYK',
  },
};

export function printImageFile(
  buffer = printPng(),
  fieldname = 'photo_file',
): Express.Multer.File {
  return {
    buffer,
    size: buffer.length,
    fieldname,
    mimetype: 'image/png',
    originalname: 'photo.png',
  } as Express.Multer.File;
}

// Synthetic 80x40 JPEG with EXIF orientation 6 (displayed as 40x80).
export const printJpegExif = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAoAFADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDnKKKK/QD5cKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD/9k=',
  'base64',
);
