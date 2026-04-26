import { Public } from '@common/decorators';
import { StorageService } from '@infrastructure/providers';
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
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

  @Get('file')
  async getFile(@Query('path') path: string) {
    if (!path) {
      throw new BadRequestException('Query param "path" é obrigatório.');
    }

    return await this.storageService.getPublicUrl(path);
  }

  @Get('file/:path')
  async getFileByParam(@Param('path') path: string) {
    if (!path) {
      throw new BadRequestException('Path param "path" é obrigatório.');
    }

    return await this.storageService.getPublicUrl(path);
  }
}
