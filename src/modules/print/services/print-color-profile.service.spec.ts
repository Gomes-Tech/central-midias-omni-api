import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { StorageService } from '@infrastructure/providers';
import { PrintColorProfileService } from './print-color-profile.service';

describe('PrintColorProfileService', () => {
  let prisma: any;
  let storage: { deleteFile: jest.Mock };
  let service: PrintColorProfileService;

  beforeEach(() => {
    prisma = {
      printColorProfile: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    };
    storage = { deleteFile: jest.fn().mockResolvedValue(undefined) };
    service = new PrintColorProfileService(
      prisma as PrismaService,
      storage as unknown as StorageService,
      { info: jest.fn() } as unknown as LoggerService,
    );
  });

  it('remove o perfil e o arquivo quando não há presets vinculados', async () => {
    prisma.printColorProfile.findUnique.mockResolvedValue({
      id: 'profile-id',
      storageKey: 'print/color-profiles/profile-id.icc',
      _count: { presets: 0 },
    });

    await expect(service.remove('profile-id', 'user-id')).resolves.toEqual({
      deleted: true,
    });
    expect(prisma.printColorProfile.delete).toHaveBeenCalledWith({
      where: { id: 'profile-id' },
    });
    expect(storage.deleteFile).toHaveBeenCalledWith([
      'print/color-profiles/profile-id.icc',
    ]);
  });

  it('rejeita remoção quando o perfil está vinculado a presets', async () => {
    prisma.printColorProfile.findUnique.mockResolvedValue({
      id: 'profile-id',
      storageKey: 'print/color-profiles/profile-id.icc',
      _count: { presets: 2 },
    });

    await expect(service.remove('profile-id', 'user-id')).rejects.toThrow(
      'vinculado a presets',
    );
    expect(prisma.printColorProfile.delete).not.toHaveBeenCalled();
    expect(storage.deleteFile).not.toHaveBeenCalled();
  });

  it('atualiza metadados quando o nome não conflita', async () => {
    prisma.printColorProfile.findUnique.mockResolvedValue({
      id: 'profile-id',
      name: 'FOGRA39',
      checksum: 'abc',
      outputConditionIdentifier: 'FOGRA39',
      description: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { presets: 0 },
    });
    prisma.printColorProfile.findFirst.mockResolvedValue(null);
    prisma.printColorProfile.update.mockResolvedValue({
      id: 'profile-id',
      name: 'FOGRA51',
      checksum: 'abc',
      outputConditionIdentifier: 'FOGRA51',
      description: 'Atualizado',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { presets: 0 },
    });

    await expect(
      service.update(
        'profile-id',
        {
          name: 'FOGRA51',
          outputConditionIdentifier: 'FOGRA51',
          description: 'Atualizado',
        },
        'user-id',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        name: 'FOGRA51',
        outputConditionIdentifier: 'FOGRA51',
      }),
    );
  });
});
