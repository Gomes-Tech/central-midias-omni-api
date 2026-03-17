import { HttpException, HttpStatus } from '@nestjs/common';

export class ForbiddenException extends HttpException {
  constructor(
    message: string = 'Você não tem permissão para executar esta ação!',
  ) {
    super(message, HttpStatus.FORBIDDEN);
  }
}
