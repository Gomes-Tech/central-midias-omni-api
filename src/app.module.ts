import { HttpExceptionFilter } from '@common/filters';
import { AuthGuard, CategoryPermissionGuard } from '@common/guards';
import {
  FileSizeValidationInterceptor,
  FileTypeValidationInterceptor,
} from '@common/interceptors';
import {
  OrganizationMiddleware,
  requestIdMiddleware,
} from '@common/middlewares';
import { CacheModule } from '@infrastructure/cache';
import { CircuitBreakerModule } from '@infrastructure/circuit-breaker';
import { ConfigModule } from '@infrastructure/config';
import { CryptographyModule } from '@infrastructure/criptography';
import { JwtModule } from '@infrastructure/jwt';
import { LogModule } from '@infrastructure/log';
import { MetricsInterceptor, MetricsModule } from '@infrastructure/metrics';
import { PrismaModule } from '@infrastructure/prisma';
import { MailModule, StorageModule } from '@infrastructure/providers';
import { SecurityModule } from '@infrastructure/security';
import { ThrottlerConfigModule } from '@infrastructure/throttler';
import { AuthModule } from '@modules/auth';
import { CategoryModule } from '@modules/category';
import { CategoryRoleAccessModule } from '@modules/category-role-access/category-role-access.module';
import { MemberModule } from '@modules/member';
import { OrganizationModule } from '@modules/organization';
import { RolesModule } from '@modules/roles';
import { TokenPasswordModule } from '@modules/token-password';
import { UserModule } from '@modules/user';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule,
    SecurityModule,
    ConfigModule,
    LogModule,
    CacheModule,
    CryptographyModule,
    CircuitBreakerModule,
    MetricsModule,
    MailModule,
    StorageModule,
    ThrottlerConfigModule,
    CategoryModule,
    MemberModule,
    OrganizationModule,
    RolesModule,
    UserModule,
    TokenPasswordModule,
    AuthModule,
    CategoryRoleAccessModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AuthGuard,
    OrganizationMiddleware,
    CategoryPermissionGuard,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FileTypeValidationInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FileSizeValidationInterceptor,
    },
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
        { path: 'auth/sign-in', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/logout', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/verify-token', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'api-docs', method: RequestMethod.ALL },
        { path: 'api-docs/(.*)', method: RequestMethod.ALL },
        { path: 'users', method: RequestMethod.GET },
        { path: 'users', method: RequestMethod.POST },
        { path: 'organizations', method: RequestMethod.POST },
        { path: 'organizations', method: RequestMethod.GET },
        { path: 'roles', method: RequestMethod.POST },
        { path: 'roles', method: RequestMethod.GET },
        { path: 'roles/(.*)', method: RequestMethod.ALL },
        { path: 'admin', method: RequestMethod.ALL },
        { path: 'admin/(.*)', method: RequestMethod.ALL },
        { path: '*', method: RequestMethod.OPTIONS },
      )
      .forRoutes('*');
  }
}
