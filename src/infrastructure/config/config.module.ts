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
          env: process.env.NODE_ENV,
          jwt: {
            secret: process.env.JWT_SECRET,
            expires: process.env.JWT_EXPIRES,
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            refreshExpires: process.env.JWT_REFRESH_EXPIRES,
          },
          port: Number(process.env.PORT || '4000'),
          databaseUrl: process.env.DATABASE_URL,
          cors: {
            allowedOrigins: process.env.ALLOWED_ORIGINS
              ? process.env.ALLOWED_ORIGINS.split(',').map((origin) =>
                  origin.trim(),
                )
              : [],
          },
          serverAuthSecret: process.env.SERVER_AUTH_SECRET,
          frontendUrl: process.env.FRONTEND_URL,
          tokenPassword: {
            expiresMinutes: Number(
              process.env.TOKEN_PASSWORD_EXPIRES_MINUTES ?? '15',
            ),
          },
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT
              ? parseInt(process.env.SMTP_PORT, 10)
              : undefined,
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
            from: process.env.SMTP_FROM,
          },
          postgres: {
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            db: process.env.POSTGRES_DB,
          },
        }),
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('dev', 'prod').default('dev'),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES: Joi.string().required(),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES: Joi.string().required(),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().uri().required(),
        SERVER_AUTH_SECRET: Joi.string().required(),
        ALLOWED_ORIGINS: Joi.string().optional(),

        // Mail / Reset password (usado apenas quando NODE_ENV === 'prod' no código)
        SMTP_HOST: Joi.string().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_PORT: Joi.number().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_USER: Joi.string().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_PASS: Joi.string().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        SMTP_FROM: Joi.string().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        FRONTEND_URL: Joi.string().when('NODE_ENV', {
          is: 'prod',
          then: Joi.required(),
          otherwise: Joi.optional(),
        }),
        TOKEN_PASSWORD_EXPIRES_MINUTES: Joi.number().default(15).optional(),

        // Credenciais podem existir no .env, mas o Prisma hoje usa DATABASE_URL
        POSTGRES_USER: Joi.string().optional(),
        POSTGRES_PASSWORD: Joi.string().optional(),
        POSTGRES_DB: Joi.string().optional(),
      }),
    }),
  ],
  exports: [NestConfigModule],
})
export class ConfigModule {}
