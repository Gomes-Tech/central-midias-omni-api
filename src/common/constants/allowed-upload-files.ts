import { extname } from 'path';

/** Extensões permitidas para upload na API (minúsculas, sem ponto). */
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'pdf',
  'doc',
  'docx',
  'mp4',
  'mp3',
  'ppt',
  'pptx',
  'eps',
  'xls',
  'xlsx',
]);

/**
 * MIME types aceitos para os formatos permitidos.
 * Uploads com `application/octet-stream` ou MIME vazio são aceitos se a extensão for permitida.
 */
export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'audio/mpeg',
  'audio/mp3',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/postscript',
  'application/eps',
  'image/x-eps',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const ALLOWED_UPLOAD_TYPES_DESCRIPTION =
  'PNG, JPEG, PDF, Word (DOC/DOCX), MP4, MP3, PowerPoint (PPT/PPTX), EPS, Excel (XLS/XLSX)';

const OCTET_STREAM = new Set([
  'application/octet-stream',
  'binary/octet-stream',
]);

export function getUploadFileExtension(originalName: string): string {
  return extname(originalName).toLowerCase().replace(/^\./, '');
}

export function isAllowedUploadFile(file: Express.Multer.File): boolean {
  const ext = getUploadFileExtension(file.originalname);
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return false;
  }

  const mime = (file.mimetype || '').toLowerCase().trim();
  if (!mime || OCTET_STREAM.has(mime)) {
    return true;
  }

  return ALLOWED_UPLOAD_MIME_TYPES.has(mime);
}
