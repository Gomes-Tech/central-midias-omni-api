import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { SupplierRepository } from './supplier.repository';

function createPrismaMock() {
  return {
    supplierDocument: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

describe('SupplierRepository', () => {
  let repository: SupplierRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new SupplierRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findDocumentKey', () => {
    it('deve retornar a key do documento quando existir registro', async () => {
      prisma.supplierDocument.findUnique.mockResolvedValue({
        fileKey: 'suppliers/lista.pdf',
      });

      await expect(repository.findDocumentKey('org-1')).resolves.toBe(
        'suppliers/lista.pdf',
      );

      expect(prisma.supplierDocument.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        select: { fileKey: true },
      });
    });

    it('deve retornar null quando a organização não possuir documento', async () => {
      prisma.supplierDocument.findUnique.mockResolvedValue(null);

      await expect(repository.findDocumentKey('org-1')).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.supplierDocument.findUnique.mockRejectedValue(new Error('db down'));

      await expect(repository.findDocumentKey('org-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'SupplierRepository.findDocumentKey falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('upsertDocument', () => {
    it('deve criar ou atualizar o documento e registrar o log', async () => {
      prisma.supplierDocument.upsert.mockResolvedValue({});

      await expect(
        repository.upsertDocument('org-1', 'suppliers/lista.pdf', 'user-1'),
      ).resolves.toBeUndefined();

      expect(prisma.supplierDocument.upsert).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        create: expect.objectContaining({
          organizationId: 'org-1',
          fileKey: 'suppliers/lista.pdf',
        }),
        update: { fileKey: 'suppliers/lista.pdf' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Documento de fornecedores atualizado',
        { organizationId: 'org-1', userId: 'user-1' },
      );
    });

    it('deve lançar BadRequest quando o upsert falhar', async () => {
      prisma.supplierDocument.upsert.mockRejectedValue(new Error('db down'));

      await expect(
        repository.upsertDocument('org-1', 'suppliers/lista.pdf', 'user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'SupplierRepository.upsertDocument falhou',
        expect.objectContaining({ organizationId: 'org-1', userId: 'user-1' }),
      );
    });
  });
});
