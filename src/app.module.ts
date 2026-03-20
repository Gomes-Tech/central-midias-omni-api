import { Module } from '@nestjs/common';
import { CompanyModule } from '@modules/company';
import { RolesModule } from '@modules/roles';
import { UserRolesModule } from '@modules/user-roles';
import { UserModule } from '@modules/user';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [CompanyModule, RolesModule, UserRolesModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
