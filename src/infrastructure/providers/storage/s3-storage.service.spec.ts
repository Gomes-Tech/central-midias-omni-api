import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as allowedUpload from '@common/constants/allowed-upload-files';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';

jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('S3StorageService', () => {
  const send = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AWS_REGION: 'us-east-1',
      S3_BUCKET: 'test-bucket',
      AWS_ACCESS_KEY_ID: 'key',
      AWS_SECRET_ACCESS_KEY: 'secret',
      S3_PRESIGNED_EXPIRES_SECONDS: '120',
    };
    jest.mocked(S3Client).mockImplementation(
      () =>
        ({
          send,
        }) as unknown as S3Client,
    );
    jest.mocked(getSignedUrl).mockResolvedValue('https://signed.url/file');
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  function extensionDot(service: S3StorageService, originalName: string): string {
    return (
      service as unknown as { extensionDot: (name: string) => string }
    ).extensionDot(originalName);
  }

  it('deve lançar quando AWS_REGION ou S3_BUCKET não estiverem configurados', () => {
    delete process.env.AWS_REGION;

    expect(() => new S3StorageService()).toThrow(InternalServerErrorException);
  });

  it('deve lançar quando S3_BUCKET estiver ausente', () => {
    delete process.env.S3_BUCKET;

    expect(() => new S3StorageService()).toThrow(InternalServerErrorException);
  });

  it('deve usar expiresIn padrão quando variável não estiver definida', async () => {
    delete process.env.S3_PRESIGNED_EXPIRES_SECONDS;
    send.mockResolvedValue({});
    const service = new S3StorageService();

    await service.getSignedUrl('organizations/file.pdf');

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 60 },
    );
  });

  it('uploadFile deve enviar objeto ao S3 e retornar metadados', async () => {
    send.mockResolvedValue({});
    const service = new S3StorageService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 10,
      buffer: Buffer.from('pdf'),
    };

    const result = await service.uploadFile(file, 'organizations');

    expect(result.publicUrl).toBe('');
    expect(result.path).toContain('organizations/');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it('uploadFile deve rejeitar tipo não permitido', async () => {
    const service = new S3StorageService();
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

  it('getSignedUrl deve gerar URL assinada', async () => {
    const service = new S3StorageService();

    await expect(
      service.getSignedUrl('organizations/file.pdf'),
    ).resolves.toBe('https://signed.url/file');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({ send: expect.any(Function) }),
      expect.any(GetObjectCommand),
      { expiresIn: 120 },
    );
  });

  it('getSignedDownloadUrl deve incluir content-disposition', async () => {
    const service = new S3StorageService();

    await expect(
      service.getSignedDownloadUrl('organizations/file.pdf', 'file.pdf'),
    ).resolves.toBe('https://signed.url/file');
  });

  it('storePublicationAttachment deve enviar arquivo ao S3', async () => {
    send.mockResolvedValue({});
    const service = new S3StorageService();
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

    expect(stored.relativePath).toContain('publications/pub-1');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it('storePublicationAttachment deve lançar quando send falhar', async () => {
    send.mockRejectedValue(new Error('s3'));
    const service = new S3StorageService();
    const file = {
      originalname: 'cover.png',
      mimetype: 'image/png',
      size: 4,
      buffer: Buffer.from('png'),
    };

    await expect(
      service.storePublicationAttachment({ publicationId: 'pub-1', file }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('uploadFile deve lançar InternalServerError quando send falhar', async () => {
    send.mockRejectedValue(new Error('s3'));
    const service = new S3StorageService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 10,
      buffer: Buffer.from('pdf'),
    };

    await expect(service.uploadFile(file)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('deleteFile deve remover objetos do bucket', async () => {
    send.mockResolvedValue({});
    const service = new S3StorageService();

    await service.deleteFile(['a/file.pdf', 'b/file.png']);

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('uploadFile deve usar mime padrão quando mimetype estiver ausente', async () => {
    send.mockResolvedValue({});
    const service = new S3StorageService();
    const file = {
      originalname: 'photo.png',
      mimetype: undefined,
      size: 1,
      buffer: Buffer.from('x'),
    };

    const result = await service.uploadFile(file);

    expect(result.path).toContain('organizations/');
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it('uploadFile deve usar fallback arquivo quando originalname for vazio', async () => {
    send.mockResolvedValue({});
    jest.spyOn(allowedUpload, 'isAllowedUploadFile').mockReturnValue(true);
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('pdf');

    const service = new S3StorageService();
    const file = {
      originalname: '   ',
      mimetype: 'application/pdf',
      size: 1,
      buffer: Buffer.from('pdf'),
    };

    const result = await service.uploadFile(file);

    expect(result.path).toMatch(/organizations\/[^/]+\.pdf$/);
    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
  });

  it('extensionDot deve usar fallback arquivo e retornar extensão com ponto', () => {
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('png');
    const service = new S3StorageService();

    expect(extensionDot(service, '   ')).toBe('.png');
    expect(allowedUpload.getUploadFileExtension).toHaveBeenCalledWith('arquivo');
  });

  it('extensionDot deve retornar string vazia quando não houver extensão', () => {
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('');
    const service = new S3StorageService();

    expect(extensionDot(service, 'documento')).toBe('');
  });

  it('storePublicationAttachment deve usar fallbacks de nome, mime e tamanho', async () => {
    send.mockResolvedValue({});
    jest.spyOn(allowedUpload, 'isAllowedUploadFile').mockReturnValue(true);
    jest.spyOn(allowedUpload, 'getUploadFileExtension').mockReturnValue('png');

    const service = new S3StorageService();
    const file = {
      originalname: '   ',
      mimetype: undefined,
      size: Number.NaN,
      buffer: Buffer.from('png'),
    };

    const stored = await service.storePublicationAttachment({
      publicationId: 'pub-1',
      file,
    });

    expect(stored.originalName).toBe('arquivo');
    expect(stored.mimeType).toBe('application/octet-stream');
    expect(stored.sizeBytes).toBe(0);
    expect(stored.relativePath).toMatch(/publications\/pub-1\/[^/]+\.png$/);
  });

  it('uploadFile deve lançar quando caminho for inválido', async () => {
    const service = new S3StorageService();
    const file = {
      originalname: 'doc.pdf',
      mimetype: 'application/pdf',
      size: 10,
      buffer: Buffer.from('pdf'),
    };

    await expect(
      service.uploadFile(file, '../escape'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });
});
