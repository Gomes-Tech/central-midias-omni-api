import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { NotificationRepository } from './notification.repository';

function createPrismaMock() {
  return {
    notification: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('NotificationRepository', () => {
  let repository: NotificationRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new NotificationRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findByUser', () => {
    it('deve listar notificações do usuário na org com paginação', async () => {
      const rows = [
        {
          id: 'n1',
          type: 'MATERIAL_CREATED',
          title: 'Novo material disponível',
          body: 'Peça · Categoria',
          href: '/material/m1',
          resourceType: 'material',
          resourceId: 'm1',
          readAt: null,
          createdAt: new Date('2026-08-29T00:00:00.000Z'),
        },
      ];
      prisma.notification.findMany.mockResolvedValue(rows);
      prisma.notification.count.mockResolvedValue(1);

      await expect(
        repository.findByUser('user-1', 'org-1'),
      ).resolves.toEqual({
        data: rows,
        total: 1,
        page: 1,
        totalPages: 1,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', organizationId: 'org-1' },
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          href: true,
          resourceType: true,
          resourceId: true,
          readAt: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: 0,
        take: 20,
      });
    });

    it('deve filtrar apenas não lidas quando onlyUnread for true', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await repository.findByUser('user-1', 'org-1', {
        onlyUnread: true,
        page: 2,
        limit: 10,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: 'user-1',
            organizationId: 'org-1',
            readAt: null,
          },
          skip: 10,
          take: 10,
        }),
      );
    });

    it('deve lançar BadRequest quando a busca falhar', async () => {
      prisma.notification.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByUser('user-1', 'org-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('countUnread', () => {
    it('deve contar não lidas do usuário na org', async () => {
      prisma.notification.count.mockResolvedValue(3);

      await expect(
        repository.countUnread('user-1', 'org-1'),
      ).resolves.toBe(3);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          readAt: null,
        },
      });
    });
  });

  describe('create', () => {
    const input = {
      organizationId: 'org-1',
      userId: 'user-1',
      type: 'MATERIAL_CREATED' as const,
      title: 'Novo material disponível',
      body: 'Peça · Categoria',
      href: '/material/m1',
      resourceType: 'material',
      resourceId: 'm1',
      dedupeKey: 'MATERIAL_CREATED:org-1:m1:user-1',
    };

    it('deve persistir notificação e devolver o item criado', async () => {
      const created = {
        id: 'n1',
        type: 'MATERIAL_CREATED',
        title: input.title,
        body: input.body,
        href: input.href,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        readAt: null,
        createdAt: new Date('2026-08-30T00:00:00.000Z'),
      };
      prisma.notification.create.mockResolvedValue(created);

      await expect(repository.create(input)).resolves.toEqual(created);
    });

    it('deve ignorar duplicata por dedupeKey', async () => {
      prisma.notification.create.mockRejectedValue({ code: 'P2002' });

      await expect(repository.create(input)).resolves.toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('deve atualizar somente a notificação do dono ainda não lida', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });

      await repository.markAsRead('n1', 'user-1', 'org-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'n1',
          userId: 'user-1',
          organizationId: 'org-1',
          readAt: null,
        },
        data: { readAt: expect.any(Date) },
      });
    });
  });
});
