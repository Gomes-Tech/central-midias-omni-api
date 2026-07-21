import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { FaqRepository } from './faq.repository';

jest.mock('@common/utils', () => {
  const actual = jest.requireActual('@common/utils') as Record<
    string,
    unknown
  >;
  return {
    ...actual,
    generateId: jest.fn(() => 'generated-id'),
  };
});

function createPrismaMock() {
  return {
    faq: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    faqItem: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    faqDetail: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
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

  describe('findAll', () => {
    it('deve buscar FAQs paginados com filtros padrão', async () => {
      const rows = [{ id: 'faq-1', name: 'FAQ', order: 1, isActive: true }];
      prisma.faq.findMany.mockResolvedValue(rows);
      prisma.faq.count.mockResolvedValue(1);

      await expect(
        repository.findAll(undefined, 'org-1'),
      ).resolves.toEqual({
        data: rows,
        total: 1,
        page: 1,
        totalPages: 1,
      });

      expect(prisma.faq.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isDeleted: false },
        select: { id: true, name: true, order: true, isActive: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 25,
      });
      expect(prisma.faq.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isDeleted: false },
      });
    });

    it('deve aplicar onlyActive, searchTerm e paginação customizada', async () => {
      prisma.faq.findMany.mockResolvedValue([]);
      prisma.faq.count.mockResolvedValue(0);

      await repository.findAll(
        { onlyActive: true, page: 2, limit: 10, searchTerm: 'termo' },
        'org-1',
      );

      expect(prisma.faq.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
          isActive: true,
          name: { contains: 'termo', mode: 'insensitive' },
        },
        select: { id: true, name: true, order: true, isActive: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: 10,
        take: 10,
      });
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faq.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll(undefined, 'org-1')).rejects.toThrow(
        'Erro ao buscar FAQs',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findAllItems', () => {
    it('deve buscar items paginados com filtros padrão', async () => {
      const rows = [
        { id: 'item-1', question: 'P', answer: 'R', order: 1 },
      ];
      prisma.faqItem.findMany.mockResolvedValue(rows);
      prisma.faqItem.count.mockResolvedValue(1);

      await expect(
        repository.findAllItems(undefined, 'org-1'),
      ).resolves.toEqual({
        data: rows,
        total: 1,
        page: 1,
        totalPages: 1,
      });

      expect(prisma.faqItem.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
          faq: { isDeleted: false },
        },
        select: { id: true, question: true, answer: true, order: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        skip: 0,
        take: 25,
      });
    });

    it('deve aplicar onlyActive e searchTerm no where', async () => {
      prisma.faqItem.findMany.mockResolvedValue([]);
      prisma.faqItem.count.mockResolvedValue(0);

      await repository.findAllItems(
        { onlyActive: true, searchTerm: 'termo', page: 2, limit: 5 },
        'org-1',
      );

      expect(prisma.faqItem.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
          faq: { isDeleted: false, isActive: true },
          OR: [
            { question: { contains: 'termo', mode: 'insensitive' } },
            { answer: { contains: 'termo', mode: 'insensitive' } },
          ],
        },
        select: { id: true, question: true, answer: true, order: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        skip: 5,
        take: 5,
      });
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faqItem.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findAllItems(undefined, 'org-1'),
      ).rejects.toThrow('Erro ao buscar items do FAQ');
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.findAllItems falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findByOrganizationId', () => {
    it('deve retornar o FAQ com detalhe da organização', async () => {
      const faq = {
        id: 'faq-1',
        name: 'FAQ',
        order: 1,
        isActive: true,
        detail: null,
      };
      prisma.faq.findFirst.mockResolvedValue(faq);

      await expect(
        repository.findByOrganizationId('org-1'),
      ).resolves.toEqual(faq);

      expect(prisma.faq.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1', isDeleted: false },
        }),
      );
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faq.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByOrganizationId('org-1'),
      ).rejects.toThrow('Erro ao buscar FAQ');
    });
  });

  describe('existsById', () => {
    it('deve retornar o FAQ ativo da organização', async () => {
      prisma.faq.findFirst.mockResolvedValue({ id: 'faq-1' });

      await expect(repository.existsById('org-1')).resolves.toEqual({
        id: 'faq-1',
      });

      expect(prisma.faq.findFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isDeleted: false },
        select: { id: true },
      });
    });

    it('deve retornar null quando a organização não possuir FAQ', async () => {
      prisma.faq.findFirst.mockResolvedValue(null);

      await expect(repository.existsById('org-1')).resolves.toBeNull();
    });
  });

  describe('create', () => {
    it('deve criar o FAQ com generateId e isActive padrão true', async () => {
      prisma.faq.create.mockResolvedValue({} as never);

      await expect(
        repository.create(
          'org-1',
          { name: 'FAQ', order: 1 },
          'user-1',
        ),
      ).resolves.toEqual({ id: 'generated-id' });

      expect(prisma.faq.create).toHaveBeenCalledWith({
        data: {
          id: 'generated-id',
          organizationId: 'org-1',
          name: 'FAQ',
          order: 1,
          isActive: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'FAQ criado',
        expect.objectContaining({ organizationId: 'org-1', userId: 'user-1' }),
      );
    });

    it('deve respeitar isActive quando informado', async () => {
      prisma.faq.create.mockResolvedValue({} as never);

      await repository.create(
        'org-1',
        { name: 'FAQ', order: 1, isActive: false },
        'user-1',
      );

      expect(prisma.faq.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.faq.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create('org-1', { name: 'FAQ', order: 1 }, 'user-1'),
      ).rejects.toThrow('Erro ao criar FAQ');
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.create falhou',
        expect.objectContaining({ organizationId: 'org-1', userId: 'user-1' }),
      );
    });
  });

  describe('update', () => {
    it('deve aplicar apenas os campos informados', async () => {
      prisma.faq.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.update(
        'faq-1',
        'org-1',
        { name: 'Novo nome' },
        'user-1',
      );

      expect(prisma.faq.updateMany).toHaveBeenCalledWith({
        where: { id: 'faq-1', organizationId: 'org-1', isDeleted: false },
        data: { name: 'Novo nome' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'FAQ atualizado',
        expect.objectContaining({ faqId: 'faq-1', organizationId: 'org-1' }),
      );
    });

    it('deve incluir order e isActive quando informados', async () => {
      prisma.faq.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.update(
        'faq-1',
        'org-1',
        { order: 3, isActive: false },
        'user-1',
      );

      expect(prisma.faq.updateMany).toHaveBeenCalledWith({
        where: { id: 'faq-1', organizationId: 'org-1', isDeleted: false },
        data: { order: 3, isActive: false },
      });
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.faq.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('faq-1', 'org-1', { name: 'x' }, 'user-1'),
      ).rejects.toThrow('Erro ao atualizar FAQ');
    });
  });

  describe('softDelete', () => {
    it('deve remover o FAQ e seus items via transação', async () => {
      prisma.faq.updateMany.mockResolvedValue({ count: 1 } as never);
      prisma.faqItem.updateMany.mockResolvedValue({ count: 2 } as never);
      prisma.$transaction.mockResolvedValue([
        { count: 1 },
        { count: 2 },
      ] as never);

      await repository.softDelete('faq-1', 'org-1', 'user-1');

      expect(prisma.faq.updateMany).toHaveBeenCalledWith({
        where: { id: 'faq-1', organizationId: 'org-1', isDeleted: false },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      });
      expect(prisma.faqItem.updateMany).toHaveBeenCalledWith({
        where: { faqId: 'faq-1', organizationId: 'org-1', isDeleted: false },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
      expect(logger.info).toHaveBeenCalledWith(
        'FAQ removido',
        expect.objectContaining({ faqId: 'faq-1', organizationId: 'org-1' }),
      );
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('db'));

      await expect(
        repository.softDelete('faq-1', 'org-1', 'user-1'),
      ).rejects.toThrow('Erro ao remover FAQ');
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.softDelete falhou',
        expect.objectContaining({ faqId: 'faq-1', organizationId: 'org-1' }),
      );
    });
  });

  describe('findItemById', () => {
    it('deve buscar item pelo faqId, itemId e organização', async () => {
      const item = { id: 'item-1', question: 'P', answer: 'R', order: 1 };
      prisma.faqItem.findFirst.mockResolvedValue(item);

      await expect(
        repository.findItemById('faq-1', 'item-1', 'org-1'),
      ).resolves.toEqual(item);

      expect(prisma.faqItem.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'item-1',
          faqId: 'faq-1',
          organizationId: 'org-1',
          isDeleted: false,
        },
        select: { id: true, question: true, answer: true, order: true },
      });
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faqItem.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findItemById('faq-1', 'item-1', 'org-1'),
      ).rejects.toThrow('Erro ao buscar item do FAQ');
    });
  });

  describe('findItemByIdOnly', () => {
    it('deve retornar o item mapeado com faqId e faqName', async () => {
      prisma.faqItem.findFirst.mockResolvedValue({
        id: 'item-1',
        question: 'P',
        answer: 'R',
        order: 1,
        faqId: 'faq-1',
        faq: { name: 'FAQ' },
      });

      await expect(
        repository.findItemByIdOnly('item-1', 'org-1'),
      ).resolves.toEqual({
        id: 'item-1',
        question: 'P',
        answer: 'R',
        order: 1,
        faqId: 'faq-1',
        faqName: 'FAQ',
      });

      expect(prisma.faqItem.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'item-1',
          organizationId: 'org-1',
          isDeleted: false,
          faq: { isDeleted: false },
        },
        select: {
          id: true,
          question: true,
          answer: true,
          order: true,
          faqId: true,
          faq: { select: { name: true } },
        },
      });
    });

    it('deve retornar null quando o item não existir', async () => {
      prisma.faqItem.findFirst.mockResolvedValue(null);

      await expect(
        repository.findItemByIdOnly('item-1', 'org-1'),
      ).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faqItem.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findItemByIdOnly('item-1', 'org-1'),
      ).rejects.toThrow('Erro ao buscar item do FAQ');
    });
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

  describe('createItem', () => {
    it('deve criar o item com generateId', async () => {
      prisma.faqItem.create.mockResolvedValue({} as never);

      await expect(
        repository.createItem(
          'faq-1',
          'org-1',
          { question: 'P', answer: 'R', order: 1 },
          'user-1',
        ),
      ).resolves.toEqual({ id: 'generated-id' });

      expect(prisma.faqItem.create).toHaveBeenCalledWith({
        data: {
          id: 'generated-id',
          faqId: 'faq-1',
          organizationId: 'org-1',
          question: 'P',
          answer: 'R',
          order: 1,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Item de FAQ criado',
        expect.objectContaining({ faqId: 'faq-1', organizationId: 'org-1' }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.faqItem.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.createItem(
          'faq-1',
          'org-1',
          { question: 'P', answer: 'R', order: 1 },
          'user-1',
        ),
      ).rejects.toThrow('Erro ao criar item do FAQ');
    });
  });

  describe('updateItem', () => {
    it('deve aplicar apenas os campos informados', async () => {
      prisma.faqItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.updateItem(
        'item-1',
        'org-1',
        { question: 'Nova pergunta' },
        'user-1',
      );

      expect(prisma.faqItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: 'org-1', isDeleted: false },
        data: { question: 'Nova pergunta' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Item de FAQ atualizado',
        expect.objectContaining({
          faqItemId: 'item-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('deve incluir answer e order quando informados', async () => {
      prisma.faqItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.updateItem(
        'item-1',
        'org-1',
        { answer: 'Nova resposta', order: 5 },
        'user-1',
      );

      expect(prisma.faqItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: 'org-1', isDeleted: false },
        data: { answer: 'Nova resposta', order: 5 },
      });
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.faqItem.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.updateItem('item-1', 'org-1', { order: 1 }, 'user-1'),
      ).rejects.toThrow('Erro ao atualizar item do FAQ');
    });
  });

  describe('softDeleteItem', () => {
    it('deve remover o item', async () => {
      prisma.faqItem.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.softDeleteItem('item-1', 'org-1', 'user-1');

      expect(prisma.faqItem.updateMany).toHaveBeenCalledWith({
        where: { id: 'item-1', organizationId: 'org-1', isDeleted: false },
        data: { isDeleted: true, deletedAt: expect.any(Date) },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Item de FAQ removido',
        expect.objectContaining({
          faqItemId: 'item-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.faqItem.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.softDeleteItem('item-1', 'org-1', 'user-1'),
      ).rejects.toThrow('Erro ao remover item do FAQ');
    });
  });

  describe('upsertDetail', () => {
    it('deve criar o detalhe com generateId quando não existir', async () => {
      prisma.faqDetail.upsert.mockResolvedValue({} as never);

      await repository.upsertDetail(
        'faq-1',
        { description: 'Descrição', imageKey: 'faqs/img.png' },
        'user-1',
      );

      expect(prisma.faqDetail.upsert).toHaveBeenCalledWith({
        where: { faqId: 'faq-1' },
        create: {
          id: 'generated-id',
          faqId: 'faq-1',
          description: 'Descrição',
          imageKey: 'faqs/img.png',
          phonePrimary: null,
          phonePrimaryLabel: null,
          phonePrimaryIsWhatsapp: false,
          phoneSecondary: null,
          phoneSecondaryLabel: null,
          phoneSecondaryIsWhatsapp: false,
        },
        update: {
          description: 'Descrição',
          imageKey: 'faqs/img.png',
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Detalhe de FAQ atualizado',
        expect.objectContaining({ faqId: 'faq-1', userId: 'user-1' }),
      );
    });

    it('deve atualizar apenas os campos informados', async () => {
      prisma.faqDetail.upsert.mockResolvedValue({} as never);

      await repository.upsertDetail(
        'faq-1',
        {
          phonePrimary: '11999999999',
          phonePrimaryLabel: 'Comercial',
          phonePrimaryIsWhatsapp: true,
          phoneSecondary: '11888888888',
          phoneSecondaryLabel: 'Financeiro',
          phoneSecondaryIsWhatsapp: false,
        },
        'user-1',
      );

      expect(prisma.faqDetail.upsert).toHaveBeenCalledWith({
        where: { faqId: 'faq-1' },
        create: expect.objectContaining({
          phonePrimary: '11999999999',
          phonePrimaryLabel: 'Comercial',
          phonePrimaryIsWhatsapp: true,
          phoneSecondary: '11888888888',
          phoneSecondaryLabel: 'Financeiro',
          phoneSecondaryIsWhatsapp: false,
        }),
        update: {
          phonePrimary: '11999999999',
          phonePrimaryLabel: 'Comercial',
          phonePrimaryIsWhatsapp: true,
          phoneSecondary: '11888888888',
          phoneSecondaryLabel: 'Financeiro',
          phoneSecondaryIsWhatsapp: false,
        },
      });
    });

    it('deve lançar BadRequest quando upsert falhar', async () => {
      prisma.faqDetail.upsert.mockRejectedValue(new Error('db'));

      await expect(
        repository.upsertDetail('faq-1', {}, 'user-1'),
      ).rejects.toThrow('Erro ao salvar detalhes do FAQ');
      expect(logger.error).toHaveBeenCalledWith(
        'FaqRepository.upsertDetail falhou',
        expect.objectContaining({ faqId: 'faq-1', userId: 'user-1' }),
      );
    });
  });

  describe('findDetailByFaqId', () => {
    it('deve retornar o detalhe do FAQ', async () => {
      const detail = { id: 'detail-1', imageKey: null, description: null };
      prisma.faqDetail.findUnique.mockResolvedValue(detail as never);

      await expect(
        repository.findDetailByFaqId('faq-1'),
      ).resolves.toEqual(detail);

      expect(prisma.faqDetail.findUnique).toHaveBeenCalledWith({
        where: { faqId: 'faq-1' },
        select: expect.objectContaining({ id: true, imageKey: true }),
      });
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.faqDetail.findUnique.mockRejectedValue(new Error('db'));

      await expect(
        repository.findDetailByFaqId('faq-1'),
      ).rejects.toThrow('Erro ao buscar detalhes do FAQ');
    });
  });
});
