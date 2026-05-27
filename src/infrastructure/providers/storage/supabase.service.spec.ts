import { createClient } from '@supabase/supabase-js';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from './supabase.service';

jest.mock('@supabase/supabase-js');

describe('SupabaseService', () => {
  const upload = jest.fn();
  const createSignedUrl = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_KEY: 'service-key',
      SUPABASE_BUCKET: 'uploads',
      SUPABASE_SIGNED_URL_EXPIRES_SECONDS: '90',
    };
    upload.mockResolvedValue({ error: null });
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/file' },
      error: null,
    });
    jest.mocked(createClient).mockReturnValue({
      storage: {
        from: jest.fn(() => ({
          upload,
          createSignedUrl,
        })),
      },
    } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('deve lançar quando variáveis de ambiente estiverem ausentes', () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_KEY;

    expect(() => new SupabaseService()).toThrow(InternalServerErrorException);
  });

  it('deve aceitar SUBAPASE_URL como fallback de SUPABASE_URL', () => {
    delete process.env.SUPABASE_URL;
    process.env.SUBAPASE_URL = 'https://typo.supabase.co';

    expect(() => new SupabaseService()).not.toThrow();

    delete process.env.SUBAPASE_URL;
  });

  it('deve usar expiresIn padrão quando variável não estiver definida', async () => {
    delete process.env.SUPABASE_SIGNED_URL_EXPIRES_SECONDS;
    const service = new SupabaseService();

    await service.getSignedUrl('organizations/file.pdf');

    expect(createSignedUrl).toHaveBeenCalledWith(
      'organizations/file.pdf',
      60,
    );
  });

  it('uploadFile deve enviar buffer ao bucket', async () => {
    const service = new SupabaseService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('pdf'),
    };

    const result = await service.uploadFile(file, 'organizations');

    expect(result.path).toContain('organizations/');
    expect(upload).toHaveBeenCalled();
  });

  it('uploadFile deve rejeitar tipo não permitido', async () => {
    const service = new SupabaseService();
    const file = {
      originalname: 'virus.exe',
      mimetype: 'application/octet-stream',
      size: 1,
      buffer: Buffer.from('x'),
    };

    await expect(service.uploadFile(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('getSignedUrl deve retornar URL assinada', async () => {
    const service = new SupabaseService();

    await expect(service.getSignedUrl('organizations/file.pdf')).resolves.toBe(
      'https://signed.example/file',
    );
    expect(createSignedUrl).toHaveBeenCalledWith(
      'organizations/file.pdf',
      90,
    );
  });

  it('getSignedUrl deve lançar quando Supabase retornar erro', async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'fail' },
    });
    const service = new SupabaseService();

    await expect(service.getSignedUrl('a/file.pdf')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('uploadFile deve lançar quando caminho for inválido', async () => {
    const service = new SupabaseService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('pdf'),
    };

    await expect(
      service.uploadFile(file, '../escape'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('getSignedUrl deve lançar quando resposta não tiver signedUrl', async () => {
    createSignedUrl.mockResolvedValue({ data: {}, error: null });
    const service = new SupabaseService();

    await expect(service.getSignedUrl('a/file.pdf')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('uploadFile deve usar mime padrão quando mimetype estiver ausente', async () => {
    const service = new SupabaseService();
    const file = {
      originalname: 'photo.png',
      mimetype: undefined,
      size: 1,
      buffer: Buffer.from('x'),
    };

    const result = await service.uploadFile(file);

    expect(result.path).toContain('organizations/');
    expect(upload).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Buffer),
      expect.objectContaining({
        contentType: 'application/octet-stream',
      }),
    );
  });

  it('uploadFile deve lançar quando upload retornar erro', async () => {
    upload.mockResolvedValue({ error: { message: 'denied' } });
    const service = new SupabaseService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('pdf'),
    };

    await expect(service.uploadFile(file)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
