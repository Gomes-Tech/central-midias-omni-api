import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { CategoryRoleAccessRepository } from './category-role-access.repository';

function createPrismaMock() {
  return {
    category: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    categoryRoleAccess: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('CategoryRoleAccessRepository', () => {
  let repository: CategoryRoleAccessRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new CategoryRoleAccessRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findActiveCategoryInOrganization', () => {
    it('deve filtrar categoria ativa na organização', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'cat-1' });

      await expect(
        repository.findActiveCategoryInOrganization('cat-1', 'org-1'),
      ).resolves.toEqual({ id: 'cat-1' });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cat-1',
          organizationId: 'org-1',
          isDeleted: false,
        },
        select: { id: true },
      });
    });

    it('deve registrar erro e lançar BadRequest quando falhar', async () => {
      prisma.category.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findActiveCategoryInOrganization('c', 'o'),
      ).rejects.toThrow('Erro ao buscar categoria');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findActiveRole', () => {
    it('deve exigir deletedAt null', async () => {
      prisma.role.findFirst.mockResolvedValue({ id: 'role-1' });

      await expect(repository.findActiveRole('role-1')).resolves.toEqual({
        id: 'role-1',
      });

      expect(prisma.role.findFirst).toHaveBeenCalledWith({
        where: { id: 'role-1', deletedAt: null },
        select: { id: true },
      });
    });

    it('deve lançar quando findFirst falhar', async () => {
      prisma.role.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findActiveRole('r')).rejects.toThrow(
        'Erro ao buscar perfil',
      );
    });
  });

  describe('findByCategoryRoleAndOrganization', () => {
    it('deve buscar vínculo único', async () => {
      prisma.categoryRoleAccess.findFirst.mockResolvedValue({ id: 'v1' });

      await expect(
        repository.findByCategoryRoleAndOrganization(
          'cat',
          'role',
          'org',
        ),
      ).resolves.toEqual({ id: 'v1' });

      expect(prisma.categoryRoleAccess.findFirst).toHaveBeenCalledWith({
        where: { categoryId: 'cat', roleId: 'role', organizationId: 'org' },
        select: { id: true },
      });
    });

    it('deve lançar quando falhar', async () => {
      prisma.categoryRoleAccess.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByCategoryRoleAndOrganization('c', 'r', 'o'),
      ).rejects.toThrow('Erro ao verificar vínculo');
    });
  });

  describe('create', () => {
    it('deve persistir com includes de category e role', async () => {
      const created = {
        id: 'new',
        categoryId: 'cat',
        roleId: 'role',
        organizationId: 'org',
        category: { id: 'cat', name: 'C', slug: 'c' },
        role: { id: 'role', name: 'R', label: 'L' },
      };
      prisma.categoryRoleAccess.create.mockResolvedValue(created);

      const result = await repository.create('org', {
        categoryId: 'cat',
        roleId: 'role',
      });

      expect(result).toEqual(created);
      expect(prisma.categoryRoleAccess.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          categoryId: 'cat',
          roleId: 'role',
          organizationId: 'org',
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          role: {
            select: { id: true, name: true, label: true },
          },
        },
      });
    });

    it('deve lançar quando create falhar', async () => {
      prisma.categoryRoleAccess.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create('org', { categoryId: 'c', roleId: 'r' }),
      ).rejects.toThrow('Erro ao criar vínculo');
    });
  });

  describe('findByIdAndOrganization', () => {
    it('deve retornar id quando existir', async () => {
      prisma.categoryRoleAccess.findFirst.mockResolvedValue({ id: 'x' });

      await expect(
        repository.findByIdAndOrganization('x', 'org'),
      ).resolves.toEqual({ id: 'x' });
    });

    it('deve lançar quando falhar', async () => {
      prisma.categoryRoleAccess.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByIdAndOrganization('x', 'org'),
      ).rejects.toThrow('Erro ao buscar vínculo');
    });
  });

  describe('deleteById', () => {
    it('deve chamar delete do prisma', async () => {
      prisma.categoryRoleAccess.delete.mockResolvedValue({} as never);

      await repository.deleteById('id-1');

      expect(prisma.categoryRoleAccess.delete).toHaveBeenCalledWith({
        where: { id: 'id-1' },
      });
    });

    it('deve lançar quando delete falhar', async () => {
      prisma.categoryRoleAccess.delete.mockRejectedValue(new Error('db'));

      await expect(repository.deleteById('id-1')).rejects.toThrow(
        'Erro ao remover vínculo',
      );
    });
  });

  describe('findAllByOrganization', () => {
    it('deve listar com includes e ordenação', async () => {
      const rows = [{ id: '1' }];
      prisma.categoryRoleAccess.findMany.mockResolvedValue(rows);

      await expect(
        repository.findAllByOrganization('org-1'),
      ).resolves.toEqual(rows);

      expect(prisma.categoryRoleAccess.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          role: {
            select: { id: true, name: true, label: true },
          },
        },
        orderBy: [{ category: { name: 'asc' } }, { role: { name: 'asc' } }],
      });
    });

    it('deve lançar quando findMany falhar', async () => {
      prisma.categoryRoleAccess.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findAllByOrganization('org'),
      ).rejects.toThrow('Erro ao listar vínculos');
    });
  });

  describe('findRoleIdsByCategoryAndOrganization', () => {
    it('deve mapear roleIds', async () => {
      prisma.categoryRoleAccess.findMany.mockResolvedValue([
        { roleId: 'r1' },
        { roleId: 'r2' },
      ]);

      await expect(
        repository.findRoleIdsByCategoryAndOrganization('cat', 'org'),
      ).resolves.toEqual(['r1', 'r2']);
    });

    it('deve lançar quando falhar', async () => {
      prisma.categoryRoleAccess.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findRoleIdsByCategoryAndOrganization('c', 'o'),
      ).rejects.toThrow('Erro ao buscar acessos da categoria');
    });
  });

  describe('findRolesByIds', () => {
    it('deve retornar array vazio sem consultar quando ids vazio', async () => {
      await expect(repository.findRolesByIds([])).resolves.toEqual([]);
      expect(prisma.role.findMany).not.toHaveBeenCalled();
    });

    it('deve buscar roles ativas por ids', async () => {
      prisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'A', label: 'L1' },
      ]);

      await expect(repository.findRolesByIds(['r1'])).resolves.toEqual([
        { id: 'r1', name: 'A', label: 'L1' },
      ]);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['r1'] }, deletedAt: null },
        select: { id: true, name: true, label: true },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve lançar quando findMany falhar', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findRolesByIds(['r1'])).rejects.toThrow(
        'Erro ao buscar perfis',
      );
    });
  });

  describe('findAllActiveGlobalRoleIds', () => {
    it('deve retornar ids de perfis globais ativos', async () => {
      prisma.role.findMany.mockResolvedValue([
        { id: 'role-1' },
        { id: 'role-2' },
      ]);

      await expect(repository.findAllActiveGlobalRoleIds()).resolves.toEqual([
        'role-1',
        'role-2',
      ]);

      expect(prisma.role.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, canAccessBackoffice: true },
        select: { id: true },
        orderBy: [{ label: 'asc' }],
      });
    });

    it('deve lançar quando findMany falhar', async () => {
      prisma.role.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllActiveGlobalRoleIds()).rejects.toThrow(
        'Erro ao buscar perfis globais',
      );
    });
  });

  describe('findAllActiveOrganizationIds', () => {
    it('deve retornar ids de organizações ativas', async () => {
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1' },
        { id: 'org-2' },
      ]);

      await expect(
        repository.findAllActiveOrganizationIds(),
      ).resolves.toEqual(['org-1', 'org-2']);

      expect(prisma.organization.findMany).toHaveBeenCalledWith({
        where: { isActive: true, isDeleted: false },
        select: { id: true },
      });
    });

    it('deve lançar quando findMany falhar', async () => {
      prisma.organization.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findAllActiveOrganizationIds(),
      ).rejects.toThrow('Erro ao buscar organizações');
    });
  });

  describe('syncGlobalRoleWithOrganizationCategories', () => {
    it('deve retornar sem criar quando organização não tiver categorias', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await repository.syncGlobalRoleWithOrganizationCategories(
        'role-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.findMany).not.toHaveBeenCalled();
      expect(prisma.categoryRoleAccess.createMany).not.toHaveBeenCalled();
    });

    it('deve criar apenas os acessos que ainda não existem', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 'cat-1' },
        { id: 'cat-2' },
      ]);
      prisma.categoryRoleAccess.findMany.mockResolvedValue([
        { categoryId: 'cat-1' },
      ]);

      await repository.syncGlobalRoleWithOrganizationCategories(
        'role-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.createMany).toHaveBeenCalledWith({
        data: [
          {
            id: 'mocked-uuid',
            categoryId: 'cat-2',
            roleId: 'role-1',
            organizationId: 'org-1',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('deve retornar sem criar quando todos os acessos já existirem', async () => {
      prisma.category.findMany.mockResolvedValue([{ id: 'cat-1' }]);
      prisma.categoryRoleAccess.findMany.mockResolvedValue([
        { categoryId: 'cat-1' },
      ]);

      await repository.syncGlobalRoleWithOrganizationCategories(
        'role-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.createMany).not.toHaveBeenCalled();
    });

    it('deve lançar quando falhar', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.syncGlobalRoleWithOrganizationCategories('role-1', 'org-1'),
      ).rejects.toThrow('Erro ao sincronizar categorias do perfil global');
    });
  });

  describe('syncCategoryWithGlobalRolesInOrganization', () => {
    it('deve retornar sem criar quando não houver perfis globais', async () => {
      prisma.categoryRoleAccess.findMany.mockResolvedValue([]);
      prisma.member.findMany.mockResolvedValue([]);

      await repository.syncCategoryWithGlobalRolesInOrganization(
        'cat-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.createMany).not.toHaveBeenCalled();
    });

    it('deve unificar perfis de acessos e membros e criar os que faltam', async () => {
      prisma.categoryRoleAccess.findMany
        .mockResolvedValueOnce([{ roleId: 'role-1' }])
        .mockResolvedValueOnce([{ roleId: 'role-1' }]);
      prisma.member.findMany.mockResolvedValue([{ roleId: 'role-2' }]);

      await repository.syncCategoryWithGlobalRolesInOrganization(
        'cat-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.createMany).toHaveBeenCalledWith({
        data: [
          {
            id: 'mocked-uuid',
            categoryId: 'cat-1',
            roleId: 'role-2',
            organizationId: 'org-1',
          },
        ],
        skipDuplicates: true,
      });
    });

    it('deve retornar sem criar quando todos os perfis já existirem na categoria', async () => {
      prisma.categoryRoleAccess.findMany
        .mockResolvedValueOnce([{ roleId: 'role-1' }])
        .mockResolvedValueOnce([{ roleId: 'role-1' }]);
      prisma.member.findMany.mockResolvedValue([]);

      await repository.syncCategoryWithGlobalRolesInOrganization(
        'cat-1',
        'org-1',
      );

      expect(prisma.categoryRoleAccess.createMany).not.toHaveBeenCalled();
    });

    it('deve lançar quando falhar', async () => {
      prisma.categoryRoleAccess.findMany.mockRejectedValue(new Error('db'));
      prisma.member.findMany.mockResolvedValue([]);

      await expect(
        repository.syncCategoryWithGlobalRolesInOrganization('cat-1', 'org-1'),
      ).rejects.toThrow('Erro ao sincronizar perfis globais com a categoria');
    });
  });
});
