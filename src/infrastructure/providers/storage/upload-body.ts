import { InternalServerErrorException } from '@nestjs/common';
import { createReadStream, promises as fsp } from 'node:fs';
import type { Readable } from 'node:stream';
import type { MulterFile } from './local-storage.service';

export function resolveUploadBody(file: MulterFile): Buffer | Readable {
  if (file.path) {
    return createReadStream(file.path);
  }

  if (file.buffer) {
    return file.buffer;
  }

  throw new InternalServerErrorException(
    'Upload sem conteúdo. O parser deve fornecer buffer ou path.',
  );
}

export function resolveUploadMimeType(file: MulterFile): string {
  return file.mimetype || 'application/octet-stream';
}

export async function unlinkUploadTemp(
  file: Pick<MulterFile, 'path'>,
): Promise<void> {
  if (!file.path) {
    return;
  }

  await fsp.unlink(file.path).catch(() => undefined);
}
