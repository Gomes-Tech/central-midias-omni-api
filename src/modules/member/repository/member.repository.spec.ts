import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { MemberRepository } from './member.repository';

jest.mock('@common/utils', () => {
  const actual = jest.requireActual('@common/utils') as Record<string, unknown>;
  return {
    ...actual,
    generateId: jest.fn(() => 'generated-member-id'),
  };
});

const memberSelect = {
  id: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarKey: true,
      isActive: true,
    },
  },
  role: {
    select: {
      label: true,
    },
  },
};

function createPrismaMock() {
  return {
    member: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('MemberRepository', () => {
  let repository: MemberRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new MemberRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve mapear membros e calcular totalPages', async () => {
      const raw = [
        {
          id: 'm1',
          user: {
            id: 'u1',
            name: 'Ana',
            email: 'ana@x.com',
            avatarKey: null,
            isActive: true,
          },
          role: { label: 'Admin' },
        },
      ];
      prisma.member.findMany.mockResolvedValue(raw);
      prisma.member.count.mockResolvedValue(50);

      const result = await repository.findAll('org-1', {
        page: 2,
        limit: 20,
      });

      expect(result).toEqual({
        data: [
          {
            id: 'm1',
            name: 'Ana',
            email: 'ana@x.com',
            isActive: true,
            role: 'Admin',
          },
        ],
        total: 50,
        page: 2,
        totalPages: 3,
      });
      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        select: memberSelect,
        orderBy: [{ user: { name: 'asc' } }],
      });
    });

    it('deve aplicar roleId e searchTerm no where', async () => {
      prisma.member.findMany.mockResolvedValue([]);
      prisma.member.count.mockResolvedValue(0);

      await repository.findAll('org-1', {
        roleId: 'role-x',
        searchTerm: 'jo',
      });

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            roleId: 'role-x',
            OR: [
              {
                user: {
                  name: { contains: 'jo', mode: 'insensitive' },
                },
              },
              {
                user: {
                  email: { contains: 'jo', mode: 'insensitive' },
                },
              },
            ],
          },
        }),
      );
    });

    it('deve lançar BadRequest quando a consulta falhar', async () => {
      prisma.member.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll('org-1')).rejects.toThrow(
        'Erro ao buscar membros',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'MemberRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar membro com seleção padrão', async () => {
      const row = {
        id: 'm1',
        user: {
          id: 'u1',
          name: 'B',
          email: 'b@c.com',
          avatarKey: null,
          isActive: true,
        },
        role: { label: 'Editor' },
      };
      prisma.member.findFirst.mockResolvedValue(row);

      await expect(repository.findById('m1', 'org-1')).resolves.toEqual(row);

      expect(prisma.member.findFirst).toHaveBeenCalledWith({
        where: { id: 'm1', organizationId: 'org-1' },
        select: memberSelect,
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.member.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findById('m1', 'org-1')).rejects.toThrow(
        'Erro ao buscar membro',
      );
    });
  });

  describe('findByOrganizationAndUser', () => {
    it('deve usar chave composta organizationId_userId', async () => {
      prisma.member.findUnique.mockResolvedValue(null);

      await repository.findByOrganizationAndUser('org-1', 'user-1');

      expect(prisma.member.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: 'org-1',
            userId: 'user-1',
          },
        },
        select: memberSelect,
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.member.findUnique.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByOrganizationAndUser('org-1', 'user-1'),
      ).rejects.toThrow('Erro ao buscar membro');
    });
  });

  describe('create', () => {
    it('deve criar membro e registrar log', async () => {
      prisma.member.create.mockResolvedValue({ id: 'new-m' });

      await repository.create(
        'org-1',
        { userId: 'user-1', roleId: 'role-1' },
        'creator-1',
      );

      expect(prisma.member.create).toHaveBeenCalledWith({
        data: {
          id: 'generated-member-id',
          organizationId: 'org-1',
          userId: 'user-1',
          roleId: 'role-1',
        },
        select: { id: true },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Membro criado',
        expect.objectContaining({
          memberId: 'new-m',
          organizationId: 'org-1',
        }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.member.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create(
          'org-1',
          { userId: 'u', roleId: 'r' },
          'c',
        ),
      ).rejects.toThrow('Erro ao criar membro');
    });
  });

  describe('update', () => {
    it('deve executar transação com updateMany e findFirstOrThrow', async () => {
      prisma.$transaction.mockImplementation(
        async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
      );
      prisma.member.updateMany.mockResolvedValue({ count: 1 });
      prisma.member.findFirstOrThrow.mockResolvedValue({});

      await repository.update(
        'm1',
        'org-1',
        { roleId: 'new-role' },
        'upd-1',
      );

      expect(prisma.member.updateMany).toHaveBeenCalledWith({
        where: { id: 'm1', organizationId: 'org-1' },
        data: { roleId: 'new-role' },
      });
      expect(prisma.member.findFirstOrThrow).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Membro atualizado',
        expect.objectContaining({ memberId: 'm1' }),
      );
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('m1', 'org-1', { roleId: 'r' }, 'u'),
      ).rejects.toThrow('Erro ao atualizar membro');
    });
  });

  describe('delete', () => {
    it('deve remover por id e organizationId', async () => {
      prisma.member.deleteMany.mockResolvedValue({ count: 1 });

      await repository.delete('m1', 'org-1');

      expect(prisma.member.deleteMany).toHaveBeenCalledWith({
        where: { id: 'm1', organizationId: 'org-1' },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Membro removido',
        expect.objectContaining({ memberId: 'm1' }),
      );
    });

    it('deve lançar BadRequest quando deleteMany falhar', async () => {
      prisma.member.deleteMany.mockRejectedValue(new Error('db'));

      await expect(repository.delete('m1', 'org-1')).rejects.toThrow(
        'Erro ao remover membro',
      );
    });
  });
});
