import { multipartMiddleware, requestIdMiddleware } from '@common/middlewares';
import { MailService } from '@infrastructure/providers/mail/mail.service';
import { StorageService } from '@infrastructure/providers/storage/storage.service';
import { S3StorageService } from '@infrastructure/providers/storage/s3-storage.service';
import { SupabaseService } from '@infrastructure/providers/storage/supabase.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from '../../src/app.module';
import { E2ePrismaService } from './e2e-prisma.service';

const e2eStorageMock = {
  uploadFile: jest.fn().mockResolvedValue({ path: 'e2e/uploads/file.png' }),
  getSignedUrl: jest.fn().mockResolvedValue('https://e2e.test/signed-url'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
};

const e2eMailMock = {
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
};

export async function createE2eApp(): Promise<INestApplication> {
  E2ePrismaService.resetStore();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(StorageService)
    .useValue({
      uploadFile: e2eStorageMock.uploadFile,
      getPublicUrl: e2eStorageMock.getSignedUrl,
      deleteFile: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(S3StorageService)
    .useValue(e2eStorageMock)
    .overrideProvider(SupabaseService)
    .useValue(e2eStorageMock)
    .overrideProvider(MailService)
    .useValue(e2eMailMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.use(multipartMiddleware);
  app.use(json({ limit: '3mb' }));
  app.use(requestIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
      validateCustomDecorators: true,
    }),
  );

  app.enableShutdownHooks();
  await app.init();

  return app;
}
