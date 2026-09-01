import { SetMetadata } from '@nestjs/common';

/**
 * Chave de metadados para o tamanho máximo de arquivo
 */
export const MAX_FILE_SIZE_KEY = 'maxFileSize';

/**
 * Quando true, o interceptor de tamanho não aplica teto nesta rota.
 */
export const SKIP_FILE_SIZE_VALIDATION_KEY = 'skipFileSizeValidation';

/**
 * Desliga o limite de tamanho de arquivo na rota (materiais, etc.).
 * O parser multipart ainda pode ter teto próprio — use o middleware
 * sem `fileSize` nesses caminhos.
 */
export const UnlimitedFileSize = () =>
  SetMetadata(SKIP_FILE_SIZE_VALIDATION_KEY, true);

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
