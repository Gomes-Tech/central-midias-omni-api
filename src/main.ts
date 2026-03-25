import { requestIdMiddleware } from '@common/middlewares';
import { getEnv } from '@infrastructure/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import { json, RequestHandler } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV !== 'prod') {
    console.log('[bootstrap] Iniciando aplicação...');
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (process.env.NODE_ENV !== 'prod') {
    console.log('[bootstrap] AppModule criado, configurando middlewares...');
  }

  app.setViewEngine('pug');
  app.setBaseViewsDir(
    join(__dirname, 'infrastructure', 'providers', 'mail', 'templates'),
  );

  app.use((cookieParser as unknown as () => RequestHandler)());
  app.use(json({ limit: '3mb' }));
  app.use(requestIdMiddleware);
  app.set('trust proxy', 1);
  app.set('query parser', 'extended');

  const normalizeOrigin = (origin: string): string => {
    let normalized = origin.trim().replace(/^["']+|["']+$/g, '');
    normalized = normalized.replace(/\/+$/, '');
    return normalized;
  };

  const rawAllowedOrigins = getEnv().api.allowedOrigins || '';
  const normalizedRawValue = normalizeOrigin(rawAllowedOrigins);

  const allowedOrigins = normalizedRawValue
    ? normalizedRawValue
        .split(',')
        .map(normalizeOrigin)
        .filter((origin) => origin.length > 0)
    : [];

  // CORS configurado ANTES de tudo
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requisições sem origin (Postman, mobile apps)
      if (!origin) {
        return callback(null, true);
      }

      // Desenvolvimento: permitir tudo se não houver origins configuradas
      if (allowedOrigins.length === 0) {
        if (process.env.NODE_ENV === 'prod') {
          console.warn('⚠️  ALLOWED_ORIGINS não configurado em produção!');
          return callback(null, false);
        }
        console.log('✅ CORS: Allowing all origins (dev mode)');
        return callback(null, true);
      }

      // Verificar origin
      const normalizedRequestOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.some(
        (allowedOrigin) =>
          allowedOrigin === normalizedRequestOrigin || allowedOrigin === origin,
      );

      if (isAllowed) {
        console.log(`✅ CORS: Allowed origin: ${origin}`);
        return callback(null, true);
      }

      console.warn(`🚫 CORS: Blocked origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'X-Forwarded-For',
      'X-Request-ID',
      'X-Api-Key',
      'X-Organization-ID',
    ],
    exposedHeaders: ['X-Token-Expired'],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix DEPOIS do CORS
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Central de Mídias API')
    .setDescription('The Central de Mídias API for Central de Mídias')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (_controllerKey: string, methodKey: string) =>
      methodKey,
    ignoreGlobalPrefix: false,
  });

  if (process.env.NODE_ENV !== 'prod') {
    SwaggerModule.setup('docs', app, document, {
      useGlobalPrefix: false,
    });
    app.use('/reference', apiReference({ content: document }));
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validateCustomDecorators: true,
    }),
  );

  // Helmet DEPOIS do CORS e global prefix
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
    }),
  );

  app.use(compress());

  app.getHttpAdapter().getInstance().disable('x-powered-by');

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  if (process.env.NODE_ENV !== 'prod') {
    console.log(`[bootstrap] API rodando em http://localhost:${port}/api`);
    console.log(`[bootstrap] Docs: http://localhost:${port}/docs`);
  }
}

bootstrap();
