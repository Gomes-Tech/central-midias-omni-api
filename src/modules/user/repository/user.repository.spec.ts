import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  makeCreateGlobalUserDTO,
  makeCreateUserDTO,
  makeUpdateUserDTO,
} from '../use-cases/test-helpers';
import { UserRepository } from './user.repository';

function createPrismaMock() {
  return {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new UserRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve retornar lista paginada com padrões page=1 e limit=10', async () => {
      const rows = [{ id: '1', name: 'A', email: 'a@b.com' }];
      prisma.user.findMany.mockResolvedValue(rows);
      prisma.user.count.mockResolvedValue(25);

      const result = await repository.findAll();

      expect(result).toEqual({
        data: rows,
        total: 25,
        page: 1,
        totalPages: 3,
      });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: { isDeleted: false },
        }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { isDeleted: false },
      });
    });

    it('deve aplicar companyId como organizationId no filtro', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll({ companyId: 'org-x', page: 2, limit: 5 });

      const expectedWhere = {
        isDeleted: false,
        platformUserOrganizations: {
          some: { organizationId: 'org-x' },
        },
      };
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: expectedWhere,
        }),
      );
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('deve montar OR de busca com taxIdentifier quando searchTerm tiver dígitos', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll({ searchTerm: 'joão 123' });

      const call = prisma.user.findMany.mock.calls[0][0];
      const or = (call.where as { OR?: unknown[] }).OR;
      expect(or).toHaveLength(3);
      expect(or?.[2]).toEqual({
        taxIdentifier: {
          contains: '123',
          mode: 'insensitive',
        },
      });
    });

    it('deve omitir taxIdentifier no OR quando searchTerm não tiver dígitos', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll({ searchTerm: 'só texto' });

      const call = prisma.user.findMany.mock.calls[0][0];
      const or = (call.where as { OR?: unknown[] }).OR;
      expect(or).toHaveLength(2);
    });

    it('deve aplicar isActive, organizationId, managerId, name e email nos filtros', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await repository.findAll({
        isActive: false,
        organizationId: 'org-z',
        managerId: 'mgr-1',
        name: 'Ana',
        email: 'ana@',
      });

      const call = prisma.user.findMany.mock.calls[0][0];
      const where = call.where as Record<string, unknown>;
      expect(where.isActive).toBe(false);
      expect(where.platformUserOrganizations).toEqual({
        some: { organizationId: 'org-z' },
      });
      expect(where.managerOf).toEqual({
        some: { managerId: 'mgr-1' },
      });
      expect(where.name).toEqual({
        contains: 'Ana',
        mode: 'insensitive',
      });
      expect(where.email).toEqual({
        contains: 'ana@',
        mode: 'insensitive',
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('deve incluir members quando isBackoffice for omitido ou false', async () => {
      const user = { id: 'u1', members: [] };
      prisma.user.findFirstOrThrow.mockResolvedValue(user);

      const result = await repository.findById('u1');

      expect(result).toBe(user);
      expect(prisma.user.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1', isDeleted: false },
          include: expect.objectContaining({
            members: expect.any(Object),
          }),
        }),
      );
    });

    it('deve incluir globalRole quando isBackoffice for true', async () => {
      prisma.user.findFirstOrThrow.mockResolvedValue({ id: 'u1' });

      await repository.findById('u1', true);

      expect(prisma.user.findFirstOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            globalRole: {
              select: { id: true, name: true, canAccessBackoffice: true },
            },
          },
        }),
      );
    });

    it('deve lançar BadRequest quando findFirstOrThrow falhar', async () => {
      prisma.user.findFirstOrThrow.mockRejectedValue(new Error('not found'));

      await expect(repository.findById('x')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findRoleByUserId', () => {
    it('deve mapear memberships quando usuário existir', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        members: [
          {
            organizationId: 'org-1',
            role: {
              id: 'r1',
              name: 'ADMIN',
              label: 'Admin',
              isSystem: true,
              canAccessBackoffice: true,
              canHaveSubordinates: false,
            },
          },
        ],
      });

      const result = await repository.findRoleByUserId('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        memberships: [
          {
            organizationId: 'org-1',
            role: {
              id: 'r1',
              name: 'ADMIN',
              label: 'Admin',
              isSystem: true,
              canAccessBackoffice: true,
              canHaveSubordinates: false,
            },
          },
        ],
      });
    });

    it('deve retornar null quando usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(repository.findRoleByUserId('missing')).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findRoleByUserId('user-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário quando existir', async () => {
      const row = { id: '1', email: 'a@b.com' };
      prisma.user.findUniqueOrThrow.mockResolvedValue(row);

      await expect(repository.findByEmail('a@b.com')).resolves.toBe(row);
    });

    it('não deve relançar quando findUniqueOrThrow falhar', async () => {
      prisma.user.findUniqueOrThrow.mockRejectedValue(new Error('missing'));

      await expect(repository.findByEmail('x@y.com')).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalled();
    });

    it('deve retornar null quando a busca resolver sem usuário', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(null as never);

      await expect(
        repository.findByEmail('ghost@test.com'),
      ).resolves.toBeNull();
    });
  });

  describe('findByTaxIdentifier', () => {
    it('deve retornar registro ou null', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        taxIdentifier: '123',
      });

      await expect(repository.findByTaxIdentifier('123')).resolves.toEqual({
        id: 'u1',
        taxIdentifier: '123',
      });
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByTaxIdentifier('123'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('create', () => {
    it('deve criar usuário e membro na transação e registrar log', async () => {
      const dto = makeCreateUserDTO();
      const memberCreate = jest.fn().mockResolvedValue({ id: 'm1' });
      prisma.user.create.mockResolvedValue({ id: 'new-user' });
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => unknown) =>
          fn({ member: { create: memberCreate } }),
      );

      const result = await repository.create(
        { ...dto, password: 'hash' },
        'creator-id',
        'org-id',
      );

      expect(result).toEqual({ id: 'new-user' });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            email: dto.email,
            password: 'hash',
            taxIdentifier: dto.taxIdentifier,
            phone: dto.phone,
            socialReason: dto.socialReason,
            birthDate: dto.birthDate,
            admissionDate: dto.admissionDate,
          }),
          select: { id: true },
        }),
      );
      expect(memberCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-id',
            userId: 'new-user',
            roleId: dto.roleId,
          }),
        }),
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('fail'));

      await expect(
        repository.create(
          { ...makeCreateUserDTO(), password: 'h' },
          'c',
          'org',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('createGlobalUser', () => {
    it('deve criar um member por organizationId', async () => {
      const dto = makeCreateGlobalUserDTO({
        organizationIds: ['o1', 'o2'],
      });
      const memberCreate = jest.fn().mockResolvedValue({ id: 'm' });
      prisma.user.create.mockResolvedValue({ id: 'gu1' });
      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => unknown) =>
          fn({ member: { create: memberCreate } }),
      );

      const result = await repository.createGlobalUser(
        { ...dto, password: 'hash' },
        'admin-id',
      );

      expect(result).toEqual({ id: 'gu1' });
      expect(memberCreate).toHaveBeenCalledTimes(2);
      expect(memberCreate).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'o1',
            userId: 'gu1',
            roleId: dto.globalRoleId,
          }),
        }),
      );
      expect(memberCreate).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'o2',
            userId: 'gu1',
            roleId: dto.globalRoleId,
          }),
        }),
      );
    });

    it('deve lançar BadRequest quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('fail'));

      await expect(
        repository.createGlobalUser(
          { ...makeCreateGlobalUserDTO(), password: 'h' },
          'a',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve persistir apenas campos definidos no DTO', async () => {
      prisma.user.update.mockResolvedValue({});

      const dto = makeUpdateUserDTO();

      await repository.update('user-1', dto, 'editor-id');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          isActive: dto.isActive,
        },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve incluir taxIdentifier, phone, socialReason e isFirstAccess quando definidos', async () => {
      prisma.user.update.mockResolvedValue({});

      await repository.update(
        'user-1',
        {
          taxIdentifier: '999',
          phone: '11999999999',
          socialReason: 'ACME',
          isFirstAccess: false,
        },
        'editor-id',
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          taxIdentifier: '999',
          phone: '11999999999',
          socialReason: 'ACME',
          isFirstAccess: false,
        },
      });
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.user.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('u', makeUpdateUserDTO(), 'e'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('delete', () => {
    it('deve fazer soft delete', async () => {
      prisma.user.update.mockResolvedValue({});

      await repository.delete('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.user.update.mockRejectedValue(new Error('db'));

      await expect(repository.delete('u')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
