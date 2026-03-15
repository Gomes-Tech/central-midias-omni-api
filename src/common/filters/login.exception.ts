import { HttpException, HttpStatus } from '@nestjs/common';

export class LoginException extends HttpException {
  constructor(message: string = 'E-mail ou senha inválidos!') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}
