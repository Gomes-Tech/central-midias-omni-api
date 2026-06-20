import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { FaqRepository } from './faq.repository';

function createPrismaMock() {
  return {
    faqItem: {
      findFirst: jest.fn(),
    },
  };
}

describe('FaqRepository', () => {
  let repository: FaqRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new FaqRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findItemByOrder', () => {
    it('deve buscar item ativo pela ordem, organização e FAQ', async () => {
      prisma.faqItem.findFirst.mockResolvedValue({
        id: 'item-1',
        order: 3,
      });

      await expect(
        repository.findItemByOrder(3, 'org-1', 'faq-1'),
      ).resolves.toEqual({
        id: 'item-1',
        order: 3,
      });

      expect(prisma.faqItem.findFirst).toHaveBeenCalledWith({
        where: {
          order: 3,
          organizationId: 'org-1',
          faqId: 'faq-1',
          isDeleted: false,
        },
        select: {
          id: true,
          order: true,
        },
      });
    });

    it('deve excluir o próprio item quando o id for informado', async () => {
      prisma.faqItem.findFirst.mockResolvedValue(null);

      await repository.findItemByOrder(2, 'org-1', 'faq-1', 'item-1');

      expect(prisma.faqItem.findFirst).toHaveBeenCalledWith({
        where: {
          order: 2,
          organizationId: 'org-1',
          faqId: 'faq-1',
          isDeleted: false,
          id: { not: 'item-1' },
        },
        select: {
          id: true,
          order: true,
        },
      });
    });

    it('deve permitir a mesma ordem em outro FAQ ou organização pelo escopo da consulta', async () => {
      prisma.faqItem.findFirst.mockResolvedValue(null);

      await expect(
        repository.findItemByOrder(1, 'org-2', 'faq-2'),
      ).resolves.toBeNull();

      expect(prisma.faqItem.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            order: 1,
            organizationId: 'org-2',
            faqId: 'faq-2',
          }),
        }),
      );
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faqItem.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findItemByOrder(1, 'org-1', 'faq-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.findItemByOrder falhou',
        expect.objectContaining({
          order: 1,
          organizationId: 'org-1',
          faqId: 'faq-1',
        }),
      );
    });
  });
});
