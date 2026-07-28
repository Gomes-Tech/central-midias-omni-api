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
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { posix } from 'node:path';
import type {
  LocalStorageFile,
  MulterFile,
  StoredFile,
} from './local-storage.service';
import type { AssetUpload, StorageProvider } from './storage-provider';

@Injectable()
export class SupabaseService implements StorageProvider {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;
  private readonly assetsBucket: string;
  private readonly expiresIn: number;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.SUBAPASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    this.bucket = process.env.SUPABASE_BUCKET ?? 'uploads';
    this.assetsBucket = process.env.SUPABASE_ASSETS_BUCKET ?? this.bucket;
    this.expiresIn = Number(
      process.env.SUPABASE_SIGNED_URL_EXPIRES_SECONDS ?? 300,
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new InternalServerErrorException(
        'Supabase: configure SUPABASE_URL e SUPABASE_KEY',
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    });
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
  ): Promise<LocalStorageFile> {
    this.assertAllowedUpload(file);

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';

    const ext = this.extensionDot(originalName);
    const id = randomUUID();
    const fileName = `${id}${ext}`;
    const path = this.safeRelativePath(folder, fileName);

    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        '=========================== ERRO ======================',
        error,
      );
      throw new BadRequestException('Erro ao fazer upload no Supabase');
    }

    return {
      id,
      path,
      fullPath: `supabase://${this.bucket}/${path}`,
      publicUrl: this.supabase.storage.from(this.bucket).getPublicUrl(path).data
        .publicUrl,
    };
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(this.bucket)
      .createSignedUrl(path, expiresIn ?? this.expiresIn);

    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        `Erro ao gerar signed url no Supabase: ${error?.message ?? 'Resposta inválida'}`,
      );
    }

    return data.signedUrl;
  }

  async getSignedDownloadUrl(path: string, filename: string): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucket)
        .createSignedUrl(path, this.expiresIn, { download: filename });

      if (error || !data?.signedUrl) {
        throw error ?? new Error('Resposta inválida');
      }

      return data.signedUrl;
    } catch {
      throw new BadRequestException(
        'Erro ao gerar URL de download no Supabase',
      );
    }
  }

  async deleteFile(paths: string[]): Promise<void> {
    if (paths.length === 0) {
      return;
    }

    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .remove(paths);

      if (error) {
        throw error;
      }
    } catch {
      throw new BadRequestException('Erro ao remover arquivo do Supabase');
    }
  }

  async remove(path: string): Promise<void> {
    return this.deleteFile([path]);
  }

  async storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile> {
    const { publicationId, file } = params;

    this.assertAllowedUpload(file);

    const originalName = file.originalname.trim() || 'arquivo';
    const mimeType = file.mimetype || 'application/octet-stream';
    const sizeBytes = Number.isFinite(file.size) ? file.size : 0;
    const fileName = `${randomUUID()}${this.extensionDot(originalName)}`;
    const path = this.safeRelativePath(
      posix.join('publications', publicationId),
      fileName,
    );

    try {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(path, file.buffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error(
        '=========================== ERRO ======================',
        error,
      );
      throw new BadRequestException('Erro ao fazer upload no Supabase');
    }

    return {
      relativePath: path,
      originalName,
      mimeType,
      sizeBytes,
    };
  }

  async uploadAsset(params: AssetUpload): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.assetsBucket)
      .upload(params.fileKey, params.buffer, {
        contentType: params.mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Erro ao fazer upload do asset no Supabase: ${error.message}`,
      );
    }
  }

  async deleteAsset(fileKey: string): Promise<void> {
    const { error } = await this.supabase.storage
      .from(this.assetsBucket)
      .remove([fileKey]);

    if (error) {
      throw new InternalServerErrorException(
        `Erro ao remover asset do Supabase: ${error.message}`,
      );
    }
  }

  getAssetPublicUrl(fileKey: string): string {
    return this.supabase.storage.from(this.assetsBucket).getPublicUrl(fileKey)
      .data.publicUrl;
  }
}
