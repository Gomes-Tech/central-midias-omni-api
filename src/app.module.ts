import { Module } from '@nestjs/common';
import { CompanyModule } from '@modules/company';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CompanyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
