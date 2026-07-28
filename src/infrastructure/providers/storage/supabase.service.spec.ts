import * as allowedUpload from '@common/constants/allowed-upload-files';
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
  const remove = jest.fn();
  const getPublicUrl = jest.fn();
  const from = jest.fn();
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
    remove.mockResolvedValue({ data: [], error: null });
    getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://public.example/file' },
    });
    from.mockReturnValue({
      upload,
      createSignedUrl,
      remove,
      getPublicUrl,
    });
    jest.mocked(createClient).mockReturnValue({
      storage: { from },
    } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function extensionDot(
    service: SupabaseService,
    originalName: string,
  ): string {
    return (
      service as unknown as { extensionDot: (name: string) => string }
    ).extensionDot(originalName);
  }

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

    expect(createSignedUrl).toHaveBeenCalledWith('organizations/file.pdf', 300);
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
    expect(result.id).toBeTruthy();
    expect(result.fullPath).toContain('supabase://uploads/organizations/');
    expect(result.publicUrl).toBe('https://public.example/file');
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
    expect(createSignedUrl).toHaveBeenCalledWith('organizations/file.pdf', 90);
  });

  it('getSignedUrl deve respeitar expiração informada', async () => {
    const service = new SupabaseService();

    await service.getSignedUrl('organizations/file.pdf', 45);

    expect(createSignedUrl).toHaveBeenCalledWith('organizations/file.pdf', 45);
  });

  it('getSignedDownloadUrl deve informar o nome para download', async () => {
    const service = new SupabaseService();

    await expect(
      service.getSignedDownloadUrl('organizations/file.pdf', 'documento.pdf'),
    ).resolves.toBe('https://signed.example/file');
    expect(createSignedUrl).toHaveBeenCalledWith('organizations/file.pdf', 90, {
      download: 'documento.pdf',
    });
  });

  it('getSignedDownloadUrl deve lançar BadRequest quando falhar', async () => {
    createSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'fail' },
    });
    const service = new SupabaseService();

    await expect(
      service.getSignedDownloadUrl('file.pdf', 'file.pdf'),
    ).rejects.toBeInstanceOf(BadRequestException);
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

    await expect(service.uploadFile(file, '../escape')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
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
      BadRequestException,
    );
  });

  it('deve usar bucket padrão quando SUPABASE_BUCKET não estiver definido', async () => {
    delete process.env.SUPABASE_BUCKET;
    const service = new SupabaseService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 4,
      buffer: Buffer.from('pdf'),
    };

    await service.uploadFile(file);

    expect(from).toHaveBeenCalledWith('uploads');
  });

  it('extensionDot deve usar fallback arquivo e retornar extensão com ponto', () => {
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('png');
    const service = new SupabaseService();

    expect(extensionDot(service, '   ')).toBe('.png');
    expect(allowedUpload.getUploadFileExtension).toHaveBeenCalledWith(
      'arquivo',
    );
  });

  it('extensionDot deve retornar string vazia quando não houver extensão', () => {
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('');
    const service = new SupabaseService();

    expect(extensionDot(service, 'documento')).toBe('');
  });

  it('uploadFile deve usar fallback arquivo quando originalname for vazio', async () => {
    jest.spyOn(allowedUpload, 'isAllowedUploadFile').mockReturnValue(true);
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('pdf');

    const service = new SupabaseService();
    const file = {
      originalname: '   ',
      mimetype: 'application/pdf',
      size: 1,
      buffer: Buffer.from('pdf'),
    };

    const result = await service.uploadFile(file);

    expect(result.path).toMatch(/organizations\/[^/]+\.pdf$/);
    expect(upload).toHaveBeenCalled();
  });

  it('deleteFile deve remover todos os caminhos em uma operação', async () => {
    const service = new SupabaseService();

    await service.deleteFile(['a/file.pdf', 'b/file.png']);

    expect(remove).toHaveBeenCalledWith(['a/file.pdf', 'b/file.png']);
  });

  it('deleteFile não deve chamar o Supabase para uma lista vazia', async () => {
    const service = new SupabaseService();

    await service.deleteFile([]);

    expect(remove).not.toHaveBeenCalled();
  });

  it('deleteFile deve lançar BadRequest quando a remoção falhar', async () => {
    remove.mockResolvedValue({ data: null, error: { message: 'denied' } });
    const service = new SupabaseService();

    await expect(service.deleteFile(['file.pdf'])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('storePublicationAttachment deve preservar metadados do arquivo', async () => {
    const service = new SupabaseService();
    const file = {
      originalname: 'cover.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('png'),
    };

    const stored = await service.storePublicationAttachment({
      publicationId: 'pub-1',
      file,
    });

    expect(stored).toEqual({
      relativePath: expect.stringMatching(/^publications\/pub-1\/.+\.png$/),
      originalName: 'cover.png',
      mimeType: 'image/png',
      sizeBytes: 4,
    });
  });

  it('deve enviar, publicar e remover assets', async () => {
    const service = new SupabaseService();
    const fileKey = 'organizations/org 1/assets/a/file.png';

    await service.uploadAsset({
      fileKey,
      buffer: Buffer.from('png'),
      mimeType: 'image/png',
    });
    expect(upload).toHaveBeenCalledWith(fileKey, expect.any(Buffer), {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
    expect(service.getAssetPublicUrl(fileKey)).toBe(
      'https://public.example/file',
    );

    await service.deleteAsset(fileKey);
    expect(remove).toHaveBeenCalledWith([fileKey]);
  });

  it('deve usar bucket separado para assets quando configurado', async () => {
    process.env.SUPABASE_ASSETS_BUCKET = 'editor-assets';
    const service = new SupabaseService();

    await service.uploadAsset({
      fileKey: 'asset.png',
      buffer: Buffer.from('png'),
      mimeType: 'image/png',
    });

    expect(from).toHaveBeenCalledWith('editor-assets');
  });
});
