import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDTO } from '../dto';
import { CreateGlobalRoleDTO } from '../dto/create-global-role.dto';
import { makeRole } from '../use-cases/test-helpers';
import { RolesRepository } from './roles.repository';

function createPrismaMock() {
  return {
    role: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    rolePermission: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

describe('RolesRepository', () => {
  let repository: RolesRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new RolesRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve usar filtros padrão quando filters não for informado', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      await repository.findAll();

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ label: 'asc' }],
        skip: 0,
        take: 25,
      });
    });

    it('deve listar perfis não deletados ordenados por label', async () => {
      const rows = [
        makeRole({ id: '1', label: 'A' }),
        makeRole({ id: '2', label: 'B' }),
      ];
      prisma.role.findMany.mockResolvedValue(rows);
      prisma.role.count.mockResolvedValue(rows.length);

      const result = await repository.findAll({});

      expect(result).toEqual({
        data: rows,
        total: 2,
        page: 1,
        totalPages: 1,
      });
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ label: 'asc' }],
        skip: 0,
        take: 25,
      });
      expect(prisma.role.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('deve propagar HttpException sem envolver', async () => {
      prisma.role.findMany.mockRejectedValue(new NotFoundException('x'));
      prisma.role.count.mockResolvedValue(0);

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));
      prisma.role.count.mockResolvedValue(0);

      await expect(repository.findAll()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findAllPermissions', () => {
    it('deve listar roles da plataforma da organização com paginação e categorias', async () => {
      const rows = [
        {
          id: 'role-1',
          name: 'EDITOR',
          label: 'Editor',
          canHaveSubordinates: false,
          categoryRoleAccesses: [
            {
              id: 'access-1',
              categoryId: 'cat-1',
              organizationId: 'org-1',
              category: {
                id: 'cat-1',
                name: 'Categoria 1',
                slug: 'categoria-1',
              },
            },
          ],
        },
      ];
      prisma.role.findMany.mockResolvedValue(rows);
      prisma.role.count.mockResolvedValue(1);

      const result = await repository.findAllPermissions('org-1', {
        page: 2,
        limit: 10,
        searchTerm: 'edit',
      });

      expect(result).toEqual({
        data: rows,
        total: 1,
        page: 2,
        totalPages: 1,
      });
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          canAccessBackoffice: false,
          categoryRoleAccesses: {
            some: {
              organizationId: 'org-1',
            },
          },
          OR: [
            {
              label: {
                contains: 'edit',
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: 'edit',
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          label: true,
          canHaveSubordinates: true,
          categoryRoleAccesses: {
            where: { organizationId: 'org-1' },
            select: {
              id: true,
              categoryId: true,
              organizationId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: [{ category: { name: 'asc' } }],
          },
        },
        orderBy: [{ label: 'asc' }],
        skip: 10,
        take: 10,
      });
      expect(prisma.role.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          canAccessBackoffice: false,
          categoryRoleAccesses: {
            some: {
              organizationId: 'org-1',
            },
          },
          OR: [
            {
              label: {
                contains: 'edit',
                mode: 'insensitive',
              },
            },
            {
              name: {
                contains: 'edit',
                mode: 'insensitive',
              },
            },
          ],
        },
      });
    });

    it('deve usar paginação padrão quando filtros não forem informados', async () => {
      prisma.role.findMany.mockResolvedValue([]);
      prisma.role.count.mockResolvedValue(0);

      const result = await repository.findAllPermissions('org-1');

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          canAccessBackoffice: false,
          categoryRoleAccesses: {
            some: {
              organizationId: 'org-1',
            },
          },
        },
        select: {
          id: true,
          name: true,
          label: true,
          canHaveSubordinates: true,
          categoryRoleAccesses: {
            where: { organizationId: 'org-1' },
            select: {
              id: true,
              categoryId: true,
              organizationId: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
            orderBy: [{ category: { name: 'asc' } }],
          },
        },
        orderBy: [{ label: 'asc' }],
        skip: 0,
        take: 25,
      });
    });

    it('deve lançar InternalServerError quando a busca falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findAllPermissions('org-1'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalledWith(
        'RolesRepository.findAllPermissions falhou',
        expect.objectContaining({
          organizationId: 'org-1',
          filters: {},
          error: expect.any(String),
        }),
      );
    });
  });

  describe('findAllSelect', () => {
    it('deve listar perfis não deletados retornando apenas id e label', async () => {
      const rows = [
        { id: '1', label: 'ROLE_A' },
        { id: '2', label: 'ROLE_B' },
      ];
      prisma.role.findMany.mockResolvedValue(rows);

      const result = await repository.findAllSelect();

      expect(result).toEqual(rows);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, canAccessBackoffice: false },
        select: {
          id: true,
          label: true,
        },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve propagar HttpException sem envolver', async () => {
      prisma.role.findMany.mockRejectedValue(new NotFoundException('x'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllSelect()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'RolesRepository.findAllSelect falhou',
        expect.objectContaining({ error: expect.any(String) }),
      );
    });
  });

  describe('findAllGlobalRolesSelect', () => {
    it('deve listar apenas perfis globais não deletados', async () => {
      const rows = [{ id: 'r-global', label: 'Admin global' }];
      prisma.role.findMany.mockResolvedValue(rows);

      const result = await repository.findAllGlobalRolesSelect();

      expect(result).toEqual(rows);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, canAccessBackoffice: true },
        select: { id: true, label: true },
      });
    });
  });

  describe('findGlobalRoleById', () => {
    it('deve buscar perfil global por id sem organizationId', async () => {
      const role = {
        id: 'r-global',
        label: 'Admin global',
        name: 'ADMIN_GLOBAL',
        isSystem: false,
        canAccessBackoffice: true,
        canHaveSubordinates: false,
        deletedAt: null,
        permissions: [
          {
            id: 'perm-1',
            moduleId: 'mod-1',
            action: 'READ',
            module: { id: 'mod-1', name: 'users', label: 'Usuários' },
          },
        ],
      };
      prisma.role.findFirst.mockResolvedValue(role);

      const result = await repository.findGlobalRoleById('r-global');

      expect(result).toEqual(role);
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'r-global',
          deletedAt: null,
          canAccessBackoffice: true,
        },
        select: {
          id: true,
          label: true,
          name: true,
          isSystem: true,
          canAccessBackoffice: true,
          canHaveSubordinates: true,
          deletedAt: true,
          permissions: {
            select: {
              id: true,
              moduleId: true,
              action: true,
              module: {
                select: {
                  id: true,
                  name: true,
                  label: true,
                },
              },
            },
            orderBy: [{ moduleId: 'asc' }, { action: 'asc' }],
          },
        },
      });
    });
  });

  describe('findById', () => {
    const organizationId = 'org-1';

    it('deve retornar null quando não existir', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('missing', organizationId),
      ).resolves.toBeNull();
      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'missing',
          deletedAt: null,
          categoryRoleAccesses: { some: { organizationId } },
        },
        select: expect.any(Object),
      });
    });

    it('deve retornar o perfil quando existir', async () => {
      const role = makeRole();
      prisma.role.findFirst.mockResolvedValue(role);

      await expect(
        repository.findById(role.id, organizationId),
      ).resolves.toEqual(role);
    });

    it('deve lançar InternalServerError quando findFirst falhar com erro genérico', async () => {
      prisma.role.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findById('id', organizationId),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByName', () => {
    it('deve buscar por name com deletedAt null', async () => {
      prisma.role.findFirst.mockResolvedValue(null);

      await repository.findByName('CODE');

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { name: 'CODE', deletedAt: null },
      });
    });

    it('deve lançar InternalServerError quando findFirst falhar com erro genérico', async () => {
      prisma.role.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findByName('X')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findByCodes', () => {
    it('deve retornar array vazio quando não houver códigos', async () => {
      await expect(repository.findByCodes([])).resolves.toEqual([]);
      expect(prisma.role.findMany).not.toHaveBeenCalled();
    });

    it('deve deduplicar códigos e filtrar deletedAt', async () => {
      prisma.role.findMany.mockResolvedValue([]);

      await repository.findByCodes(['A', 'A', 'B']);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: {
          name: { in: ['A', 'B'] },
          deletedAt: null,
        },
      });
    });

    it('deve lançar InternalServerError quando findMany falhar com erro genérico', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findByCodes(['A'])).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findCanAccessBackofficeByUserId', () => {
    it('deve retornar false quando usuário não existir', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        repository.findCanAccessBackofficeByUserId('user-1'),
      ).resolves.toBe(false);
    });

    it('deve retornar true quando globalRole permitir backoffice', async () => {
      prisma.user.findFirst.mockResolvedValue({
        globalRole: { canAccessBackoffice: true },
        members: [],
      });

      await expect(
        repository.findCanAccessBackofficeByUserId('user-1'),
      ).resolves.toBe(true);
    });

    it('deve retornar true quando algum membro tiver papel com backoffice', async () => {
      prisma.user.findFirst.mockResolvedValue({
        globalRole: { canAccessBackoffice: false },
        members: [{ role: { canAccessBackoffice: true } }],
      });

      await expect(
        repository.findCanAccessBackofficeByUserId('user-1'),
      ).resolves.toBe(true);
    });

    it('deve retornar false quando nenhum papel permitir backoffice', async () => {
      prisma.user.findFirst.mockResolvedValue({
        globalRole: { canAccessBackoffice: false },
        members: [{ role: { canAccessBackoffice: false } }],
      });

      await expect(
        repository.findCanAccessBackofficeByUserId('user-1'),
      ).resolves.toBe(false);
    });

    it('deve lançar InternalServerError quando findFirst falhar', async () => {
      prisma.user.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findCanAccessBackofficeByUserId('user-1'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('create', () => {
    it('deve criar perfil e retornar id e name', async () => {
      prisma.role.create.mockResolvedValue({
        id: 'new-id',
        name: 'ROLE_X',
      });

      const data: CreateRoleDTO = {
        name: 'ROLE_X',
        label: 'X',
        canHaveSubordinates: false,
        categoryRoleAccesses: [],
      };

      const result = await repository.create(data);

      expect(result).toEqual({ id: 'new-id', name: 'ROLE_X' });
      expect(prisma.role.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          label: 'X',
          name: 'ROLE_X',
          canHaveSubordinates: false,
        },
        select: { id: true, name: true },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar InternalServerError quando create falhar com erro genérico', async () => {
      prisma.role.create.mockRejectedValue(new Error('db'));

      const data: CreateRoleDTO = {
        name: 'R',
        label: 'L',
        canHaveSubordinates: false,
        categoryRoleAccesses: [],
      };

      await expect(repository.create(data)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('createGlobalRole', () => {
    it('deve executar transação criando role e permissões', async () => {
      const txRoleCreate = jest.fn().mockResolvedValue({ id: 'r-global' });
      const txCreateMany = jest.fn().mockResolvedValue({ count: 1 });

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            role: { create: txRoleCreate },
            rolePermission: { createMany: txCreateMany },
          }),
      );

      const data: CreateGlobalRoleDTO = {
        name: 'G',
        label: 'Global',
        permissions: [
          { moduleId: 'm1', action: 'READ' },
          { moduleId: 'm2', action: 'UPDATE' },
        ],
      };

      await expect(repository.createGlobalRole(data)).resolves.toEqual({
        id: 'r-global',
      });

      expect(txRoleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            label: 'Global',
            name: 'G',
            canAccessBackoffice: true,
          }),
          select: { id: true },
        }),
      );
      expect(txCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            roleId: 'r-global',
            moduleId: 'm1',
            action: 'READ',
          }),
          expect.objectContaining({
            roleId: 'r-global',
            moduleId: 'm2',
            action: 'UPDATE',
          }),
        ]),
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar BadRequestException e logar erro quando a transação falhar', async () => {
      prisma.$transaction.mockRejectedValue(new Error('tx fail'));

      const data: CreateGlobalRoleDTO = {
        name: 'G',
        label: 'Global',
        permissions: [{ moduleId: 'm1', action: 'READ' }],
      };

      await expect(repository.createGlobalRole(data)).rejects.toThrow(
        'Erro ao criar perfil global',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve aplicar apenas campos definidos', async () => {
      const updated = makeRole({ label: 'Novo' });
      prisma.role.update.mockResolvedValue(updated);

      const result = await repository.update('id-1', {
        label: 'Novo',
        canAccessBackoffice: true,
      });

      expect(result).toEqual(updated);
      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: {
          label: 'Novo',
          canAccessBackoffice: true,
        },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve incluir name e canHaveSubordinates quando informados', async () => {
      const updated = makeRole();
      prisma.role.update.mockResolvedValue(updated);

      await repository.update('id-1', {
        name: 'ROLE_X',
        canHaveSubordinates: true,
      });

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'id-1' },
        data: {
          name: 'ROLE_X',
          canHaveSubordinates: true,
        },
      });
    });

    it('deve lançar InternalServerError quando update falhar com erro genérico', async () => {
      prisma.role.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('id-1', { label: 'x' }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('updateGlobalRole', () => {
    it('deve atualizar metadados e substituir permissões quando informadas', async () => {
      const txDeleteMany = jest.fn().mockResolvedValue({ count: 2 });
      const txCreateMany = jest.fn().mockResolvedValue({ count: 1 });
      const updated = {
        id: 'r-global',
        label: 'Novo global',
        name: 'NOVO_GLOBAL',
        isSystem: false,
        canAccessBackoffice: true,
        canHaveSubordinates: false,
        deletedAt: null,
        permissions: [
          {
            id: 'perm-1',
            moduleId: 'mod-1',
            action: 'READ',
            module: { id: 'mod-1', name: 'users', label: 'Usuários' },
          },
        ],
      };
      const txUpdate = jest.fn().mockResolvedValue(updated);

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            role: { update: txUpdate },
            rolePermission: {
              deleteMany: txDeleteMany,
              createMany: txCreateMany,
            },
          }),
      );

      const result = await repository.updateGlobalRole('r-global', {
        label: 'Novo global',
        name: 'NOVO_GLOBAL',
        permissions: [{ moduleId: 'mod-1', action: 'READ' }],
      });

      expect(result).toEqual(updated);
      expect(txDeleteMany).toHaveBeenCalledWith({
        where: { roleId: 'r-global' },
      });
      expect(txCreateMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            roleId: 'r-global',
            moduleId: 'mod-1',
            action: 'READ',
          }),
        ],
      });
      expect(txUpdate).toHaveBeenCalledWith({
        where: { id: 'r-global' },
        data: {
          label: 'Novo global',
          name: 'NOVO_GLOBAL',
        },
        select: expect.objectContaining({
          id: true,
          permissions: expect.any(Object),
        }),
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('não deve alterar permissões quando permissions não for informado', async () => {
      const txDeleteMany = jest.fn();
      const txCreateMany = jest.fn();
      const txUpdate = jest.fn().mockResolvedValue({
        id: 'r-global',
        label: 'Novo global',
        name: 'GLOBAL',
        isSystem: false,
        canAccessBackoffice: true,
        canHaveSubordinates: false,
        deletedAt: null,
        permissions: [],
      });

      prisma.$transaction.mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            role: { update: txUpdate },
            rolePermission: {
              deleteMany: txDeleteMany,
              createMany: txCreateMany,
            },
          }),
      );

      await repository.updateGlobalRole('r-global', {
        label: 'Novo global',
      });

      expect(txDeleteMany).not.toHaveBeenCalled();
      expect(txCreateMany).not.toHaveBeenCalled();
      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { label: 'Novo global' },
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('deve definir deletedAt', async () => {
      prisma.role.update.mockResolvedValue({} as never);

      await repository.softDelete('rid');

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'rid' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve lançar InternalServerError quando update falhar com erro genérico', async () => {
      prisma.role.update.mockRejectedValue(new Error('db'));

      await expect(repository.softDelete('rid')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('softDeleteGlobalRole', () => {
    it('deve definir deletedAt em perfil global', async () => {
      prisma.role.update.mockResolvedValue({} as never);

      await repository.softDeleteGlobalRole('r-global');

      expect(prisma.role.update).toHaveBeenCalledWith({
        where: { id: 'r-global' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(logger.info).toHaveBeenCalledWith('Perfil global inativado', {
        roleId: 'r-global',
      });
    });

    it('deve lançar InternalServerError quando update falhar com erro genérico', async () => {
      prisma.role.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.softDeleteGlobalRole('r-global'),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(logger.error).toHaveBeenCalled();
    });
  });
});
