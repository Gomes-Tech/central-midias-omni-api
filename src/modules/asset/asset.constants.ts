import { AllowedFileTypesPolicy } from '@common/decorators';

export const ASSET_UPLOAD_MAX_FILES = 20;
export const ASSET_UPLOAD_MAX_SIZE_MB = 5;

export const ASSET_FILE_TYPES_POLICY: AllowedFileTypesPolicy = {
  extensions: ['png', 'jpg', 'jpeg', 'svg'],
  mimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
  description: 'PNG, JPG/JPEG e SVG',
};
