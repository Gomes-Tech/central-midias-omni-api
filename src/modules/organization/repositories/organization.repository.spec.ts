import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  makeCreateOrganizationDTO,
  makeOrganization,
  makeUpdateOrganizationDTO,
} from '../use-cases/test-helpers';
import { OrganizationRepository } from './organization.repository';

function createPrismaMock() {
  return {
    user: {
      findFirst: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new OrganizationRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve listar organizações ativas ordenadas por nome', async () => {
      const rows = [
        {
          id: '1',
          name: 'Alpha',
          slug: 'alpha',
          avatarKey: null,
          isActive: true,
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: '2',
          name: 'Beta',
          slug: 'beta',
          avatarKey: null,
          isActive: true,
          createdAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ];
      prisma.organization.findMany.mockResolvedValue(rows);
      prisma.organization.count.mockResolvedValue(2);

      const result = await repository.findAll();

      expect(result).toEqual({
        data: rows,
        total: 2,
        page: 1,
        totalPages: 1,
      });
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        select: {
          id: true,
          name: true,
          slug: true,
          avatarKey: true,
          primaryColor: true,
          secondaryColor: true,
          createdAt: true,
          isActive: true,
        },
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.organization.count).toHaveBeenCalledWith({
        where: { isDeleted: false },
      });
    });

    it('deve filtrar por searchTerm quando informado', async () => {
      prisma.organization.findMany.mockResolvedValue([]);
      prisma.organization.count.mockResolvedValue(0);

      await repository.findAll({ searchTerm: 'alpha' });

      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isDeleted: false,
            name: { contains: 'alpha', mode: 'insensitive' },
          },
        }),
      );
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.organization.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.findAll falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findAllSelect', () => {
    it('deve listar organizações ativas retornando apenas id e name', async () => {
      const rows = [
        { id: '1', name: 'Alpha' },
        { id: '2', name: 'Beta' },
      ];
      prisma.organization.findMany.mockResolvedValue(rows);

      const result = await repository.findAllSelect();

      expect(result).toEqual(rows);
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true, isDeleted: false },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.organization.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.findAllSelect falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findAccessibleSelectForUser', () => {
    it('deve listar organizações ativas onde o usuário é membro (inclui global ADMIN)', async () => {
      prisma.user.findFirst.mockResolvedValue({
        globalRole: { name: 'ADMIN' },
      });

      const rows = [
        { id: '1', name: 'Alpha', avatarKey: null },
        { id: '2', name: 'Beta', avatarKey: null },
      ];
      prisma.organization.findMany.mockResolvedValue(rows);

      const result = await repository.findAccessibleSelectForUser('user-1');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-1',
          isActive: true,
          isDeleted: false,
        },
        select: {
          globalRole: {
            select: { name: true },
          },
        },
      });
      expect(result).toEqual(rows);
      expect(prisma.organization.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isDeleted: false,
          members: {
            some: {
              userId: 'user-1',
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          avatarKey: true,
          primaryColor: true,
          secondaryColor: true,
        },
      });
    });

    it('para usuário não-ADMIN deve listar apenas organizações onde é membro', async () => {
      prisma.user.findFirst.mockResolvedValue({
        globalRole: { name: 'VIEWER' },
      });

      const rows = [{ id: 'org-1', name: 'Somente estas', avatarKey: null }];
      prisma.organization.findMany.mockResolvedValue(rows);

      const result = await repository.findAccessibleSelectForUser('user-2');

      expect(prisma.organization.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isDeleted: false,
          members: {
            some: {
              userId: 'user-2',
            },
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          avatarKey: true,
          primaryColor: true,
          secondaryColor: true,
        },
      });
      expect(result).toEqual(rows);
    });

    it('deve lançar BadRequest quando usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        repository.findAccessibleSelectForUser('missing'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.organization.findMany).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando falha inesperada', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findAccessibleSelectForUser('u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.findAccessibleSelectForUser falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar null quando não existir', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'missing' },
        select: {
          id: true,
          name: true,
          slug: true,
          domain: true,
          shouldAttachUsersByDomain: true,
          avatarKey: true,
          primaryColor: true,
          secondaryColor: true,
          isActive: true,
          createdAt: true,
        },
      });
    });

    it('deve retornar a organização quando existir', async () => {
      const org = makeOrganization();
      prisma.organization.findUnique.mockResolvedValue(org);

      await expect(repository.findById(org.id)).resolves.toEqual(org);
    });

    it('deve lançar BadRequest quando findUnique falhar', async () => {
      prisma.organization.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findById('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findBySlug', () => {
    it('deve buscar por slug', async () => {
      const org = makeOrganization({ slug: 'acme' });
      prisma.organization.findUnique.mockResolvedValue(org);

      await expect(repository.findBySlug('acme')).resolves.toEqual(org);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: 'acme' },
      });
    });

    it('deve retornar null quando não existir slug', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(repository.findBySlug('unknown')).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findUnique falhar', async () => {
      prisma.organization.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findBySlug('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    function createTransactionMock(overrides: {
      txOrgCreate?: jest.Mock;
      txRoleFind?: jest.Mock;
      txMemberCreate?: jest.Mock;
      txFaqCreate?: jest.Mock;
    } = {}) {
      const txOrgCreate =
        overrides.txOrgCreate ?? jest.fn().mockResolvedValue({ id: 'new-org-id' });
      const txRoleFind =
        overrides.txRoleFind ?? jest.fn().mockResolvedValue({ id: 'admin-role-id' });
      const txMemberCreate =
        overrides.txMemberCreate ?? jest.fn().mockResolvedValue({});
      const txFaqCreate =
        overrides.txFaqCreate ?? jest.fn().mockResolvedValue({});

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            organization: { create: txOrgCreate },
            role: { findFirstOrThrow: txRoleFind },
            member: { create: txMemberCreate },
            faq: { create: txFaqCreate },
            calendarEventType: {
              findFirst: jest.fn().mockResolvedValue({ id: 'holiday-type-id' }),
              create: jest.fn().mockResolvedValue({ id: 'holiday-type-id' }),
            },
            calendarEvent: {
              findMany: jest.fn().mockResolvedValue([]),
              update: jest.fn(),
              createMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          }),
      );

      return { txOrgCreate, txRoleFind, txMemberCreate, txFaqCreate };
    }

    it('deve executar transação criando organização, membro e role ADMIN', async () => {
      const { txOrgCreate, txRoleFind, txMemberCreate, txFaqCreate } =
        createTransactionMock();

      const dto = makeCreateOrganizationDTO();
      await repository.create(
        { ...dto, avatarKey: 'https://cdn.example/avatar.png' },
        'user-1',
      );

      expect(txOrgCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            slug: dto.slug,
            isActive: true,
            avatarKey: 'https://cdn.example/avatar.png',
            domain: dto.domain,
            shouldAttachUsersByDomain: true,
            primaryColor: null,
            secondaryColor: null,
          }),
          select: { id: true },
        }),
      );
      expect(txRoleFind).toHaveBeenCalledWith({
        where: {
          name: 'ADMIN',
          users: { some: { id: 'user-1' } },
        },
        select: { id: true },
      });
      expect(txMemberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'new-org-id',
            userId: 'user-1',
            roleId: 'admin-role-id',
          }),
        }),
      );
      expect(txFaqCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'new-org-id',
            name: 'FAQ',
            order: 0,
            isActive: true,
          }),
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Organização criada',
        expect.objectContaining({
          organizationId: 'new-org-id',
          userId: 'user-1',
        }),
      );
    });

    it('deve aplicar padrões quando campos opcionais forem omitidos', async () => {
      const { txOrgCreate } = createTransactionMock({
        txOrgCreate: jest.fn().mockResolvedValue({ id: 'o1' }),
        txRoleFind: jest.fn().mockResolvedValue({ id: 'r1' }),
      });

      await repository.create(
        { name: 'Só nome', slug: 'so-nome', avatarKey: null },
        'u1',
      );

      expect(txOrgCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: true,
            avatarKey: null,
            domain: null,
            shouldAttachUsersByDomain: false,
            primaryColor: null,
            secondaryColor: null,
          }),
        }),
      );
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('tx'));

      await expect(
        repository.create(
          { ...makeCreateOrganizationDTO(), avatarKey: null },
          'user-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'OrganizationRepository.create falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar organização e registrar log', async () => {
      prisma.organization.update.mockResolvedValue(makeOrganization());

      const data = makeUpdateOrganizationDTO();
      await repository.update('org-1', data, 'user-2');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data,
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Organização atualizada',
        expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-2',
        }),
      );
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.organization.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('x', makeUpdateOrganizationDTO(), 'u'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve desativar organização (soft delete)', async () => {
      prisma.organization.update.mockResolvedValue(makeOrganization());

      await repository.delete('org-del');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-del' },
        data: { isActive: false },
      });
    });

    it('deve lançar BadRequest quando soft delete falhar', async () => {
      prisma.organization.update.mockRejectedValue(new Error('db'));

      await expect(repository.delete('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
