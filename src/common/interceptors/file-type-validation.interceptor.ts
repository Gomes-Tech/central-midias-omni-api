import {
  ALLOWED_UPLOAD_TYPES_DESCRIPTION,
  isAllowedUploadFile,
} from '@common/constants/allowed-upload-files';
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Valida MIME/extensão dos arquivos enviados contra a lista permitida na API.
 */
@Injectable()
export class FileTypeValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (!request.file && !request.files) {
      return next.handle();
    }

    if (request.file) {
      this.validateFile(request.file);
    }

    if (request.files) {
      if (Array.isArray(request.files)) {
        request.files.forEach((file: Express.Multer.File) => {
          this.validateFile(file);
        });
      } else {
        Object.values(request.files).forEach((fileArray: unknown) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) => {
              this.validateFile(file);
            });
          } else if (
            fileArray &&
            typeof fileArray === 'object' &&
            'size' in (fileArray as Express.Multer.File)
          ) {
            this.validateFile(fileArray as Express.Multer.File);
          }
        });
      }
    }

    return next.handle();
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      return;
    }

    if (!isAllowedUploadFile(file)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido. São aceitos apenas: ${ALLOWED_UPLOAD_TYPES_DESCRIPTION}.`,
      );
    }
  }
}
