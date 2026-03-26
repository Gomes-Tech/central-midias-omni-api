import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { MAX_FILE_SIZE_KEY } from '../decorators/max-file-size.decorator';

/**
 * Interceptor para validar o tamanho de arquivos enviados
 *
 * Valida arquivos antes de processá-los, lançando BadRequestException
 * se o tamanho exceder o limite configurado.
 */
@Injectable()
export class FileSizeValidationInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const maxFileSize = this.reflector.getAllAndOverride<number>(
      MAX_FILE_SIZE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Se não houver limite configurado, usar padrão de 5MB
    const maxSize = maxFileSize || 5 * 1024 * 1024; // 5MB padrão

    if (!request.file && !request.files) {
      return next.handle();
    }

    // Validar arquivo único
    if (request.file) {
      this.validateFile(request.file, maxSize);
    }

    // Validar múltiplos arquivos
    if (request.files) {
      if (Array.isArray(request.files)) {
        // Array de arquivos
        request.files.forEach((file: Express.Multer.File) => {
          this.validateFile(file, maxSize);
        });
      } else {
        // Objeto com arrays de arquivos (ex: { desktopImages: [...], mobileImages: [...] })
        Object.values(request.files).forEach((fileArray: any) => {
          if (Array.isArray(fileArray)) {
            fileArray.forEach((file: Express.Multer.File) => {
              this.validateFile(file, maxSize);
            });
          } else if (fileArray && fileArray.size) {
            // Arquivo único em objeto
            this.validateFile(fileArray, maxSize);
          }
        });
      }
    }

    return next.handle();
  }

  /**
   * Valida o tamanho de um arquivo
   */
  private validateFile(file: Express.Multer.File, maxSize: number): void {
    if (!file) {
      return;
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      throw new BadRequestException(
        `Arquivo "${file.originalname}" excede o tamanho máximo permitido de ${maxSizeMB}MB. Tamanho atual: ${fileSizeMB}MB`,
      );
    }
  }
}
