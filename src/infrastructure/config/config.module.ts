import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        () => ({
          jwt: {
            secret: process.env.JWT_SECRET,
            expires: process.env.JWT_EXPIRES,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            refreshExpires: process.env.JWT_REFRESH_EXPIRES,
          },
          port: Number(process.env.PORT || '3000'),
          databaseUrl: process.env.DATABASE_URL,
          cors: {
            allowedOrigins: process.env.ALLOWED_ORIGINS
              ? process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
                  origin.trim(),
                )
              : [],
          },
        }),
      ],
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES: Joi.string().required(),
        PORT: Joi.number().default(3333),
        DATABASE_URL: Joi.string().uri().required(),
        SERVER_AUTH_SECRET: Joi.string().required(),
        ALLOWED_ORIGINS: Joi.string().optional(),
      }),
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
