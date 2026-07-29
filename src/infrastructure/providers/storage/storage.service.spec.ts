import type { StorageProvider } from './storage-provider';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  const storageProvider = {
    uploadFile: jest.fn(),
    readFile: jest.fn(),
    getSignedUrl: jest.fn(),
    getSignedDownloadUrl: jest.fn(),
    deleteFile: jest.fn(),
    storePublicationAttachment: jest.fn(),
  } as unknown as jest.Mocked<StorageProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve delegar todas as operações ao provider configurado', async () => {
    const service = new StorageService(storageProvider);
    const file = {
      originalname: 'file.pdf',
      mimetype: 'application/pdf',
      size: 3,
      buffer: Buffer.from('pdf'),
    };
    const uploaded = {
      id: 'id',
      path: 'documents/id.pdf',
      fullPath: 'provider://bucket/documents/id.pdf',
      publicUrl: 'https://public.test/documents/id.pdf',
    };
    storageProvider.uploadFile.mockResolvedValue(uploaded);
    storageProvider.readFile.mockResolvedValue(Buffer.from('stored'));
    storageProvider.getSignedUrl.mockResolvedValue('https://signed.test/view');
    storageProvider.getSignedDownloadUrl.mockResolvedValue(
      'https://signed.test/download',
    );
    storageProvider.deleteFile.mockResolvedValue(undefined);
    storageProvider.storePublicationAttachment.mockResolvedValue({
      relativePath: 'publications/pub/file.pdf',
      originalName: 'file.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
    });

    await expect(service.uploadFile(file, 'documents')).resolves.toEqual(
      uploaded,
    );
    await expect(service.readFile(uploaded.path)).resolves.toEqual(
      Buffer.from('stored'),
    );
    await expect(service.getPublicUrl(uploaded.path, 30)).resolves.toBe(
      'https://signed.test/view',
    );
    await expect(
      service.getDownloadUrl(uploaded.path, 'file.pdf'),
    ).resolves.toBe('https://signed.test/download');
    await expect(service.deleteFile([uploaded.path])).resolves.toBeUndefined();
    await expect(
      service.storePublicationAttachment({ publicationId: 'pub', file }),
    ).resolves.toEqual(expect.objectContaining({ originalName: 'file.pdf' }));

    expect(storageProvider.uploadFile).toHaveBeenCalledWith(file, 'documents');
    expect(storageProvider.readFile).toHaveBeenCalledWith(uploaded.path);
    expect(storageProvider.getSignedUrl).toHaveBeenCalledWith(
      uploaded.path,
      30,
    );
    expect(storageProvider.getSignedDownloadUrl).toHaveBeenCalledWith(
      uploaded.path,
      'file.pdf',
    );
    expect(storageProvider.deleteFile).toHaveBeenCalledWith([uploaded.path]);
  });
});
