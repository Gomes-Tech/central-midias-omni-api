import { Public } from '@common/decorators';
import { Injectable } from '@nestjs/common';

@Public()
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
