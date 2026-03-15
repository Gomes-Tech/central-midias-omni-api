import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { promises as fsp } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { randomUUID } from 'node:crypto';

export type StoredFile = Readonly<{
  relativePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}>;

export type MulterFile = Readonly<{
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path?: string;
}>;

@Injectable()
export class LocalStorageService {
  private readonly rootDir = join(process.cwd(), 'storage');

  private safeJoin(root: string, rel: string): string {
    const full = normalize(join(root, rel));
    if (!full.startsWith(root + sep) && full !== root) {
      throw new InternalServerErrorException('Caminho inválido.');
    }
    return full;
  }

  private async ensureDir(dirPath: string): Promise<void> {
    await fsp.mkdir(dirPath, { recursive: true });
  }

  async storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile> {
    const { publicationId, file } = params;

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';
    const sizeBytes = Number.isFinite(file.size) ? file.size : 0;

    const ext = this.guessExt(originalName, mimeType);
    const fileName = `${randomUUID()}${ext}`;
    const relativePath = join('publications', publicationId, fileName);

    const absolutePath = this.safeJoin(this.rootDir, relativePath);
    const absoluteDir = this.safeJoin(
      this.rootDir,
      join('publications', publicationId),
    );

    await this.ensureDir(absoluteDir);

    try {
      if (file.buffer && file.buffer.length >= 0) {
        await fsp.writeFile(absolutePath, file.buffer);
      } else {
        throw new InternalServerErrorException(
          'Upload sem buffer. Verifique se o FileInterceptor está usando memoryStorage().',
        );
      }
    } catch {
      throw new InternalServerErrorException(
        'Falha ao salvar arquivo no disco.',
      );
    }

    return { relativePath, originalName, mimeType, sizeBytes };
  }

  async remove(relativePath: string): Promise<void> {
    const abs = this.safeJoin(this.rootDir, relativePath);
    await fsp.unlink(abs).catch(() => undefined);
  }

  private guessExt(originalName: string, mimeType: string): string {
    const fromName = extname(originalName.trim()).toLowerCase();

    const allowed = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif']);

    if (fromName && allowed.has(fromName)) return fromName;

    const byMime: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };

    const fromMime = byMime[mimeType];
    if (fromMime) return fromMime;

    return '';
  }
}
