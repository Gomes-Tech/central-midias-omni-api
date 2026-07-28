import {
  ALLOWED_UPLOAD_TYPES_DESCRIPTION,
  getUploadFileExtension,
  isAllowedUploadFile,
} from '@common/constants/allowed-upload-files';
import {
  ALLOWED_FILE_TYPES_KEY,
  AllowedFileTypesPolicy,
} from '@common/decorators/allowed-file-types.decorator';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

/**
 * Valida MIME/extensão dos arquivos enviados contra a lista permitida na API.
 */
@Injectable()
export class FileTypeValidationInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const policy = this.reflector?.getAllAndOverride<AllowedFileTypesPolicy>(
      ALLOWED_FILE_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!request.file && !request.files) {
      return next.handle();
    }

    if (request.file) {
      this.validateFile(request.file, policy);
    }

    if (request.files) {
      if (Array.isArray(request.files)) {
        request.files.forEach((file: Express.Multer.File) => {
          this.validateFile(file, policy);
        });
      } else {
        Object.values(request.files).forEach((fileArray: unknown) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) => {
              this.validateFile(file, policy);
            });
          } else if (
            fileArray &&
            typeof fileArray === 'object' &&
            'size' in (fileArray as Express.Multer.File)
          ) {
            this.validateFile(fileArray as Express.Multer.File, policy);
          }
        });
      }
    }

    return next.handle();
  }

  private validateFile(
    file: Express.Multer.File,
    policy?: AllowedFileTypesPolicy,
  ): void {
    if (!file) {
      return;
    }

    if (policy) {
      const extension = getUploadFileExtension(file.originalname);
      const mimeType = (file.mimetype || '').toLowerCase().trim();
      const isAllowed =
        policy.extensions.includes(extension) &&
        policy.mimeTypes.includes(mimeType);

      if (!isAllowed) {
        throw new BadRequestException(
          `Tipo de arquivo não permitido. São aceitos apenas: ${policy.description}.`,
        );
      }
      return;
    }

    if (!isAllowedUploadFile(file)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. São aceitos apenas: ${ALLOWED_UPLOAD_TYPES_DESCRIPTION}.`,
      );
    }
  }
}
