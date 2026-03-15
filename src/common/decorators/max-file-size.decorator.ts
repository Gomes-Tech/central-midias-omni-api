import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadados para o tamanho máximo de arquivo
 */
export const MAX_FILE_SIZE_KEY = 'maxFileSize';

/**
 * Decorator para definir o tamanho máximo de arquivo permitido
 *
 * @param maxSizeInBytes - Tamanho máximo em bytes
 * @param maxSizeInMB - Tamanho máximo em MB (alternativa)
 *
 * @example
 * ```typescript
 * @MaxFileSize(5 * 1024 * 1024) // 5MB em bytes
 * @Post('upload')
 * async upload(@UploadedFile() file: Express.Multer.File) {
 *   // ...
 * }
 * ```
 *
 * @example
 * ```typescript
 * @MaxFileSize(undefined, 10) // 10MB
 * @Post('upload')
 * async upload(@UploadedFile() file: Express.Multer.File) {
 *   // ...
 * }
 * ```
 */
export const MaxFileSize = (maxSizeInBytes?: number, maxSizeInMB?: number) => {
  let sizeInBytes: number;

  if (maxSizeInMB !== undefined) {
    sizeInBytes = maxSizeInMB * 1024 * 1024; // Converter MB para bytes
  } else if (maxSizeInBytes !== undefined) {
    sizeInBytes = maxSizeInBytes;
  } else {
    // Valor padrão: 5MB
    sizeInBytes = 5 * 1024 * 1024;
  }

  return SetMetadata(MAX_FILE_SIZE_KEY, sizeInBytes);
};
