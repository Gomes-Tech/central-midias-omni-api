import { SetMetadata } from '@nestjs/common';

export const ALLOWED_FILE_TYPES_KEY = 'allowed_file_types';

export interface AllowedFileTypesPolicy {
  extensions: string[];
  mimeTypes: string[];
  description: string;
}

export const AllowedFileTypes = (policy: AllowedFileTypesPolicy) =>
  SetMetadata(ALLOWED_FILE_TYPES_KEY, policy);
