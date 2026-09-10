import { Public } from '@common/decorators';
import { StorageService } from '@infrastructure/providers';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Public()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
