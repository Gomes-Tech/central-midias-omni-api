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
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MulterFile } from './local-storage.service';

@Injectable()
export class SupabaseService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly expiresIn: number;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.SUBAPASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    this.bucket = process.env.SUPABASE_BUCKET ?? 'uploads';
    this.expiresIn = Number(
      process.env.SUPABASE_SIGNED_URL_EXPIRES_SECONDS ?? 60,
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new InternalServerErrorException(
        'Supabase: configure SUPABASE_URL e SUPABASE_KEY',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private safeRelativePath(folder: string, fileName: string): string {
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

  async uploadFile(
    file: MulterFile,
    folder = 'organizations',
  ): Promise<{ path: string }> {
    this.assertAllowedUpload(file);

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';

    const ext = this.extensionDot(originalName);
    const fileName = `${randomUUID()}${ext}`;
    const path = this.safeRelativePath(folder, fileName);

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Erro ao fazer upload no Supabase: ${error.message}`,
      );
    }

    return { path };
  }

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, this.expiresIn);

    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        `Erro ao gerar signed url no Supabase: ${error?.message ?? 'Resposta inválida'}`,
      );
    }

    return data.signedUrl;
  }
}
