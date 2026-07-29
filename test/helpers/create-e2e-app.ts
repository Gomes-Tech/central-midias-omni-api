import { multipartMiddleware, requestIdMiddleware } from '@common/middlewares';
import { MailService } from '@infrastructure/providers/mail/mail.service';
import { STORAGE_PROVIDER } from '@infrastructure/providers/storage/storage-provider';
import { StorageService } from '@infrastructure/providers/storage/storage.service';
import { AssetStorageService } from '@modules/asset';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import { AppModule } from '../../src/app.module';
import { E2ePrismaService } from './e2e-prisma.service';

const e2ePng = Buffer.alloc(24);
Buffer.from('89504e470d0a1a0a', 'hex').copy(e2ePng);
e2ePng.writeUInt32BE(1080, 16);
e2ePng.writeUInt32BE(1080, 20);

const e2eStorageMock = {
  uploadFile: jest.fn().mockResolvedValue({ path: 'e2e/uploads/file.png' }),
  readFile: jest.fn().mockResolvedValue(e2ePng),
  getSignedUrl: jest.fn().mockResolvedValue('https://e2e.test/signed-url'),
  deleteObject: jest.fn().mockResolvedValue(undefined),
};

export const e2eAssetStorageMock = {
  upload: jest.fn(
    async (
      _organizationId: string,
      assetId: string,
      file: { extension: string; buffer: Buffer },
    ) => ({
      fileKey: `e2e/assets/${assetId}.${file.extension}`,
    }),
  ),
  getPublicUrl: jest.fn(
    (fileKey: string) => `https://e2e-assets.test/${fileKey}`,
  ),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  deleteFiles: jest.fn().mockResolvedValue(undefined),
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
      readFile: e2eStorageMock.readFile,
      getPublicUrl: e2eStorageMock.getSignedUrl,
      deleteFile: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(STORAGE_PROVIDER)
    .useValue(e2eStorageMock)
    .overrideProvider(AssetStorageService)
    .useValue(e2eAssetStorageMock)
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
