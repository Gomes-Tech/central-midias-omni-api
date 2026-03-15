import { HttpException, HttpStatus } from '@nestjs/common';

export class NotFoundException extends HttpException {
  constructor(message: string = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND);
  }
}
