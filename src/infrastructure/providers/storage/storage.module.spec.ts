import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageService } from './s3-storage.service';
import { StorageModule } from './storage.module';
import { STORAGE_PROVIDER } from './storage-provider';

describe('StorageModule', () => {
  const originalEnv = process.env;
  let testingModule: TestingModule | undefined;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      S3_BUCKET: 'uploads',
      S3_ASSETS_BUCKET: 'assets',
    };
    delete process.env.STORAGE_PROVIDER;
  });

  afterEach(async () => {
    await testingModule?.close();
    testingModule = undefined;
    process.env = originalEnv;
  });

  it('deve usar S3 por padrão', async () => {
    testingModule = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(testingModule.get(STORAGE_PROVIDER)).toBeInstanceOf(
      S3StorageService,
    );
  });

  it('deve usar S3 quando STORAGE_PROVIDER=s3', async () => {
    process.env.STORAGE_PROVIDER = 's3';
    testingModule = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(testingModule.get(STORAGE_PROVIDER)).toBeInstanceOf(
      S3StorageService,
    );
  });

  it('deve rejeitar provider desconhecido', async () => {
    process.env.STORAGE_PROVIDER = 'unknown';

    await expect(
      Test.createTestingModule({ imports: [StorageModule] }).compile(),
    ).rejects.toThrow('Storage provider inválido: unknown');
  });
});
