import { Test, TestingModule } from '@nestjs/testing';
import { S3StorageService } from './s3-storage.service';
import { StorageModule } from './storage.module';
import { STORAGE_PROVIDER } from './storage-provider';
import { SupabaseService } from './supabase.service';

describe('StorageModule', () => {
  const originalEnv = process.env;
  let testingModule: TestingModule | undefined;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_KEY: 'service-key',
      SUPABASE_BUCKET: 'uploads',
      AWS_REGION: 'us-east-1',
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      S3_BUCKET: 'uploads',
      S3_ASSETS_BUCKET: 'assets',
    };
  });

  afterEach(async () => {
    await testingModule?.close();
    testingModule = undefined;
    process.env = originalEnv;
  });

  it('deve usar Supabase por padrão', async () => {
    delete process.env.STORAGE_PROVIDER;
    testingModule = await Test.createTestingModule({
      imports: [StorageModule],
    }).compile();

    expect(testingModule.get(STORAGE_PROVIDER)).toBeInstanceOf(SupabaseService);
  });

  it('deve permitir retornar ao S3 por configuração', async () => {
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
