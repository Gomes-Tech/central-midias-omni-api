import { AuthGuard, CategoryPermissionGuard } from '@common/guards';
import { OrganizationMiddleware } from '@common/middlewares/organization.middleware';
import { requestIdMiddleware } from '@common/middlewares/request-id.middleware';
import { JwtModule } from '@infrastructure/jwt';
import { PrismaModule } from '@infrastructure/prisma';
import { SecurityModule } from '@infrastructure/security';
import { OrganizationModule } from '@modules/organization';
import { RolesModule } from '@modules/roles';
import { UserModule } from '@modules/user';
import { UserRolesModule } from '@modules/user-roles';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule,
    SecurityModule,
    OrganizationModule,
    RolesModule,
    UserRolesModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    OrganizationMiddleware,
    CategoryPermissionGuard,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes('*');

    consumer
      .apply(OrganizationMiddleware)
      .exclude(
        { path: '/', method: RequestMethod.GET },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/(.*)', method: RequestMethod.ALL },
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/(.*)', method: RequestMethod.ALL },
        { path: 'admin', method: RequestMethod.ALL },
        { path: 'admin/(.*)', method: RequestMethod.ALL },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes('*');
  }
}
