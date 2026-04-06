import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  ALLOWED_UPLOAD_TYPES_DESCRIPTION,
  getUploadFileExtension,
  isAllowedUploadFile,
} from '@common/constants/allowed-upload-files';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';

import type {
  LocalStorageFile,
  MulterFile,
  StoredFile,
} from './local-storage.service';

@Injectable()
export class S3StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor() {
    const region = process.env.AWS_REGION;
    this.bucket = process.env.S3_BUCKET ?? '';

    if (!region || !this.bucket) {
      throw new InternalServerErrorException(
        'S3: configure AWS_REGION e S3_BUCKET',
      );
    }

    this.s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    this.expiresIn = Number(process.env.S3_PRESIGNED_EXPIRES_SECONDS ?? 60);
  }

  private safeRelativeKey(folder: string, fileName: string): string {
    const relativePath = posix.join(folder, fileName);
    if (relativePath.includes('..') || relativePath.startsWith('/')) {
      throw new InternalServerErrorException('Caminho inválido.');
    }
    return relativePath;
  }

  private assertAllowedUpload(file: MulterFile): void {
    if (!isAllowedUploadFile(file as Express.Multer.File)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. São aceitos apenas: ${ALLOWED_UPLOAD_TYPES_DESCRIPTION}.`,
      );
    }
  }

  private extensionDot(originalName: string): string {
    const ext = getUploadFileExtension(originalName.trim() || 'arquivo');
    return ext ? `.${ext}` : '';
  }

  // ✅ UPLOAD
  async uploadFile(
    file: MulterFile,
    folder = 'organizations',
  ): Promise<LocalStorageFile> {
    this.assertAllowedUpload(file);

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';

    const ext = this.extensionDot(originalName);
    const id = randomUUID();
    const fileName = `${id}${ext}`;

    const key = this.safeRelativeKey(folder, fileName);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: mimeType,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Erro ao fazer upload no S3');
    }

    return {
      id,
      path: key,
      fullPath: `s3://${this.bucket}/${key}`,
      publicUrl: '', // 🚨 NÃO gerar URL aqui
    };
  }

  // ✅ GERAR URL (VIEW)
  async getSignedViewUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
    });
  }

  // ✅ GERAR URL (DOWNLOAD)
  async getSignedDownloadUrl(key: string, filename: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: this.expiresIn,
    });
  }

  // ✅ DELETE
  async deleteFile(paths: string[]): Promise<void> {
    await Promise.all(paths.map((p) => this.remove(p)));
  }

  async remove(key: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      // idempotente
    }
  }

  // ✅ STORE (caso específico do seu domínio)
  async storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile> {
    const { publicationId, file } = params;

    this.assertAllowedUpload(file);

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';
    const sizeBytes = Number.isFinite(file.size) ? file.size : 0;

    const ext = this.extensionDot(originalName);
    const fileName = `${randomUUID()}${ext}`;

    const key = this.safeRelativeKey(
      posix.join('publications', publicationId),
      fileName,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: mimeType,
        }),
      );
    } catch {
      throw new InternalServerErrorException('Erro ao fazer upload no S3');
    }

    return {
      relativePath: key,
      originalName,
      mimeType,
      sizeBytes,
    };
  }
}
