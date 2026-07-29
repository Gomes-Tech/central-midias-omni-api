import type {
  LocalStorageFile,
  MulterFile,
  StoredFile,
} from './local-storage.service';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface AssetUpload {
  fileKey: string;
  buffer: Buffer;
  mimeType: string;
}

export interface StorageProvider {
  uploadFile(file: MulterFile, folder?: string): Promise<LocalStorageFile>;
  readFile(path: string): Promise<Buffer>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
  getSignedDownloadUrl(path: string, filename: string): Promise<string>;
  deleteFile(paths: string[]): Promise<void>;
  remove(path: string): Promise<void>;
  storePublicationAttachment(params: {
    publicationId: string;
    file: MulterFile;
  }): Promise<StoredFile>;
  uploadAsset(params: AssetUpload): Promise<void>;
  deleteAsset(fileKey: string): Promise<void>;
  getAssetPublicUrl(fileKey: string): string;
}
