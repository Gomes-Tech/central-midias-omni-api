jest.mock('node:fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

import { promises as fsp } from 'node:fs';
import { InternalServerErrorException } from '@nestjs/common';
import { LocalStorageService, MulterFile } from './local-storage.service';

describe('LocalStorageService', () => {
  let service: LocalStorageService;

  beforeEach(() => {
    service = new LocalStorageService();
    jest.mocked(fsp.mkdir).mockResolvedValue(undefined);
    jest.mocked(fsp.writeFile).mockResolvedValue(undefined);
    jest.mocked(fsp.unlink).mockResolvedValue(undefined);
  });

  it('getPublicUrl deve normalizar separadores', () => {
    expect(service.getPublicUrl('org\\file.png')).toBe('/storage/org/file.png');
  });

  it('uploadFile deve gravar buffer e retornar metadados', async () => {
    const file: MulterFile = {
      originalname: ' doc.pdf ',
      mimetype: 'application/pdf',
      size: 10,
      buffer: Buffer.from('x'),
    };

    const result = await service.uploadFile(file, 'organizations');

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.publicUrl).toContain('/storage/');
    expect(fsp.writeFile).toHaveBeenCalled();
  });

  it('uploadFile deve lançar quando não houver buffer', async () => {
    const file = {
      originalname: 'a.png',
      mimetype: 'image/png',
      size: 0,
    } as MulterFile;

    await expect(service.uploadFile(file)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('uploadFile deve lançar quando writeFile falhar', async () => {
    jest.mocked(fsp.writeFile).mockRejectedValueOnce(new Error('disk'));
    const file: MulterFile = {
      originalname: 'a.png',
      mimetype: 'image/png',
      size: 1,
      buffer: Buffer.from('z'),
    };

    await expect(service.uploadFile(file)).rejects.toThrow(
      'Falha ao salvar arquivo no disco.',
    );
  });

  it('storePublicationAttachment deve salvar sob publications/{id}', async () => {
    const file: MulterFile = {
      originalname: 'x.png',
      mimetype: 'image/png',
      size: 2,
      buffer: Buffer.from('ab'),
    };

    const stored = await service.storePublicationAttachment({
      publicationId: 'pub-1',
      file,
    });

    expect(stored.relativePath).toContain('publications');
    expect(stored.relativePath).toContain('pub-1');
    expect(stored.mimeType).toBe('image/png');
  });

  it('deleteFile deve chamar unlink para cada path', async () => {
    await service.deleteFile(['a/b.png', 'c/d.png']);
    expect(fsp.unlink).toHaveBeenCalledTimes(2);
  });
});
