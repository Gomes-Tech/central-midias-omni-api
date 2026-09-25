import { LoggerService } from '@infrastructure/log';
import { CreateAssetsUseCase } from './create-assets.use-case';

function uploadFile(name: string): Express.Multer.File {
  return { originalname: name, fieldname: 'files' } as Express.Multer.File;
}

describe('CreateAssetsUseCase', () => {
  const organizationId = 'org-1';
  const userId = 'user-1';
  let repository: { createMany: jest.Mock };
  let validator: { prepare: jest.Mock };
  let storage: {
    upload: jest.Mock;
    deleteFiles: jest.Mock;
    getPublicUrl: jest.Mock;
  };
  let logger: LoggerService;
  let useCase: CreateAssetsUseCase;

  beforeEach(() => {
    repository = { createMany: jest.fn() };
    validator = {
      prepare: jest.fn((file: Express.Multer.File) => ({
        buffer: Buffer.from('png'),
        extension: 'png',
        mimeType: 'image/png',
        size: 3,
        defaultName: file.originalname,
      })),
    };
    storage = {
      upload: jest.fn(),
      deleteFiles: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest.fn((key) => `https://assets.test/${key}`),
    };
    logger = { error: jest.fn() } as unknown as LoggerService;
    useCase = new CreateAssetsUseCase(
      repository as never,
      validator as never,
      storage as never,
      logger,
    );
  });

  it('deve criar lote mantendo a ordem e retornar URLs públicas', async () => {
    storage.upload
      .mockResolvedValueOnce({ fileKey: 'key-a' })
      .mockResolvedValueOnce({ fileKey: 'key-b' });
    repository.createMany.mockImplementation(
      async (_org: string, data: Array<Record<string, unknown>>) =>
        data.map((item) => ({
          ...item,
          organizationId,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
        })),
    );

    const result = await useCase.execute(
      organizationId,
      [uploadFile('a'), uploadFile('b')],
      userId,
    );

    expect(result.map((asset) => asset.name)).toEqual(['a', 'b']);
    expect(result.map((asset) => asset.url)).toEqual([
      'https://assets.test/key-a',
      'https://assets.test/key-b',
    ]);
    expect(repository.createMany).toHaveBeenCalledWith(
      organizationId,
      expect.any(Array),
      userId,
    );
  });

  it('deve limpar uploads concluídos quando outro upload falhar', async () => {
    const error = new Error('upload failure');
    storage.upload
      .mockResolvedValueOnce({ fileKey: 'key-a' })
      .mockRejectedValueOnce(error);

    await expect(
      useCase.execute(
        organizationId,
        [uploadFile('a'), uploadFile('b')],
        userId,
      ),
    ).rejects.toBe(error);

    expect(storage.deleteFiles).toHaveBeenCalledWith(['key-a']);
    expect(repository.createMany).not.toHaveBeenCalled();
  });

  it('deve limpar todos os uploads quando a transação falhar', async () => {
    storage.upload
      .mockResolvedValueOnce({ fileKey: 'key-a' })
      .mockResolvedValueOnce({ fileKey: 'key-b' });
    repository.createMany.mockRejectedValue(new Error('db'));

    await expect(
      useCase.execute(
        organizationId,
        [uploadFile('a'), uploadFile('b')],
        userId,
      ),
    ).rejects.toThrow('db');

    expect(storage.deleteFiles).toHaveBeenCalledWith(['key-a', 'key-b']);
  });
});
