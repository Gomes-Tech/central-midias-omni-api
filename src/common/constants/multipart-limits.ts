/** Teto por arquivo no parser em memória (banners, avatares, assets, etc.). */
export const MULTIPART_MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Máximo de arquivos por request (cobre o lote de assets). */
export const MULTIPART_MAX_FILES = 20;

/** Teto do body inteiro das rotas em memória, com folga para campos de formulário. */
export const MULTIPART_MAX_REQUEST_BYTES =
  MULTIPART_MAX_FILE_BYTES * MULTIPART_MAX_FILES + 2 * 1024 * 1024;

export const MULTIPART_MAX_FILE_MB = MULTIPART_MAX_FILE_BYTES / (1024 * 1024);
