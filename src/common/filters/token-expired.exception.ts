import { HttpException, HttpStatus } from '@nestjs/common';

export class TokenExpiredException extends HttpException {
  constructor(message: string = 'Token expirado') {
    super(message, HttpStatus.UNAUTHORIZED);
  }
}
