import { HttpException, HttpStatus } from '@nestjs/common';

export class UploadFileException extends HttpException {
  constructor(
    message: string = 'Ocorreu um problema ao carregar o arquivo, tente novamente dentro de alguns minutos!',
  ) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
