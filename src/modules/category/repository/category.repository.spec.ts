import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { CategoryRepository } from './category.repository';

jest.mock('@common/utils', () => {
  const actual = jest.requireActual('@common/utils') as Record<string, unknown>;
  return {
    ...actual,
    generateId: jest.fn(() => 'generated-category-id'),
  };
});

function createPrismaMock() {
  return {
    category: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
    $transaction: jest.fn(),
  };
}

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (callback) =>
      callback(prisma),
    );
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new CategoryRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve montar where com filtros opcionais e ordenar', async () => {
      const rows = [
        {
          id: 'c1',
          name: 'Alpha',
          slug: 'alpha',
          isActive: true,
          order: 0,
          parentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      prisma.category.findMany.mockResolvedValue(rows);

      const result = await repository.findAll('org-1', {
        parentId: null,
        isActive: true,
        searchTerm: 'al',
      });

      expect(result).toEqual(rows);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
          parentId: null,
          isActive: true,
          OR: [
            { name: { contains: 'al', mode: 'insensitive' } },
            { slug: { contains: 'al', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          slugPath: true,
          isActive: true,
          order: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll('org-1')).rejects.toThrow(
        'Erro ao buscar categorias',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'CategoryRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findTree', () => {
    beforeEach(() => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
    });

    it('deve agrupar filhos sob o pai na árvore', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Pai',
          slug: 'pai',
          isActive: true,
          order: 0,
          parentId: null,
          categoryRoleAccesses: [],
        },
        {
          id: 'f1',
          name: 'Filho',
          slug: 'filho',
          isActive: true,
          order: 1,
          parentId: 'p1',
          categoryRoleAccesses: [],
        },
      ]);

      const tree = await repository.findTree('org-1', 'user-1');

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('p1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('f1');
      expect(prisma.member.findFirst).toHaveBeenCalled();
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            isDeleted: false,
          }),
        }),
      );
    });

    it('deve aplicar os mesmos filtros do findAll na busca da árvore', async () => {
      prisma.category.findMany.mockResolvedValue([]);

      await repository.findTree('org-1', 'user-1', {
        parentId: null,
        isActive: false,
        searchTerm: 'live',
      });

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
          parentId: null,
          isActive: false,
          OR: [
            { name: { contains: 'live', mode: 'insensitive' } },
            { slug: { contains: 'live', mode: 'insensitive' } },
          ],
        },
        orderBy: [{ order: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          slugPath: true,
          isActive: true,
          order: true,
          parentId: true,
          categoryRoleAccesses: {
            select: { roleId: true },
          },
        },
      });
    });

    it('deve retornar vazio quando o usuário não for membro da organização', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      const tree = await repository.findTree('org-1', 'user-1');

      expect(tree).toEqual([]);
      expect(prisma.category.findMany).not.toHaveBeenCalled();
    });

    it('deve retornar a árvore completa para admin global sem member', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        globalRole: {
          name: 'ADMIN',
          canAccessBackoffice: true,
        },
      });
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Restrita',
          slug: 'restrita',
          isActive: true,
          order: 0,
          parentId: null,
          categoryRoleAccesses: [{ roleId: 'other-role' }],
        },
        {
          id: 'c2',
          name: 'Livre',
          slug: 'livre',
          isActive: true,
          order: 1,
          parentId: null,
          categoryRoleAccesses: [],
        },
      ]);

      const tree = await repository.findTree('org-1', 'admin-1');

      expect(tree).toHaveLength(2);
      expect(tree.map((item) => item.id)).toEqual(['c1', 'c2']);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'admin-1',
          isActive: true,
          isDeleted: false,
        },
        select: {
          globalRole: {
            select: {
              name: true,
              canAccessBackoffice: true,
            },
          },
        },
      });
    });

    it('deve incluir ancestrais quando apenas o filho tiver acesso', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Pai',
          slug: 'pai',
          isActive: true,
          order: 0,
          parentId: null,
          categoryRoleAccesses: [{ roleId: 'other-role' }],
        },
        {
          id: 'f1',
          name: 'Filho',
          slug: 'filho',
          isActive: true,
          order: 1,
          parentId: 'p1',
          categoryRoleAccesses: [{ roleId: 'role-1' }],
        },
      ]);

      const tree = await repository.findTree('org-1', 'user-1');

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('p1');
      expect(tree[0].children[0].id).toBe('f1');
    });

    it('deve ocultar categorias restritas a outro papel', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Restrita',
          slug: 'restrita',
          isActive: true,
          order: 0,
          parentId: null,
          categoryRoleAccesses: [{ roleId: 'other-role' }],
        },
        {
          id: 'c2',
          name: 'Livre',
          slug: 'livre',
          isActive: true,
          order: 1,
          parentId: null,
          categoryRoleAccesses: [],
        },
      ]);

      const tree = await repository.findTree('org-1', 'user-1');

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('c2');
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findTree('org-1', 'u1')).rejects.toThrow(
        'Erro ao buscar árvore de categorias',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('deve ignorar categoria sem nó no mapa (defensivo)', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'a',
          name: 'A',
          slug: 'a',
          isActive: true,
          order: 0,
          parentId: null,
          categoryRoleAccesses: [],
        },
        {
          id: 'b',
          name: 'B',
          slug: 'b',
          isActive: true,
          order: 1,
          parentId: null,
          categoryRoleAccesses: [],
        },
      ]);

      const originalSet = Map.prototype.set;
      const setSpy = jest
        .spyOn(Map.prototype, 'set')
        .mockImplementation(function (
          this: Map<string, unknown>,
          key: unknown,
          value: unknown,
        ) {
          if (key === 'b') {
            return this;
          }
          return originalSet.call(this, key as string, value);
        });

      try {
        const tree = await repository.findTree('org-1', 'u1');
        expect(tree).toHaveLength(1);
        expect(tree[0].id).toBe('a');
      } finally {
        setSpy.mockRestore();
      }
    });
  });

  describe('findById', () => {
    it('deve retornar detalhes quando existir', async () => {
      const detail = {
        id: 'c1',
        organizationId: 'org-1',
        name: 'Cat',
        slug: 'cat',
        isActive: true,
        order: 0,
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        parent: null,
        children: [],
      };
      prisma.category.findFirst.mockResolvedValue(detail);

      await expect(
        repository.findById('c1', 'org-1'),
      ).resolves.toEqual(detail);

      expect(prisma.category.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1', organizationId: 'org-1', isDeleted: false },
        }),
      );
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.category.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findById('c1', 'org-1')).rejects.toThrow(
        'Erro ao buscar categoria',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('findBySlugPath', () => {
    it('deve buscar por organizationId e slugPath', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'c1',
        slug: 'redes-sociais',
        slugPath: 'marketing/redes-sociais',
      });

      await expect(
        repository.findBySlugPath('marketing/redes-sociais', 'org-1'),
      ).resolves.toEqual({
        id: 'c1',
        slug: 'redes-sociais',
        slugPath: 'marketing/redes-sociais',
      });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          slugPath: 'marketing/redes-sociais',
          isDeleted: false,
        },
        select: { id: true, slug: true, slugPath: true },
      });
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.category.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findBySlugPath('s', 'org'),
      ).rejects.toThrow('Erro ao buscar categoria');
    });
  });

  describe('findSiblingBySlug', () => {
    it('deve buscar irmão com mesmo slug no mesmo nível (raiz)', async () => {
      prisma.category.findFirst.mockResolvedValue({
        id: 'c1',
        slug: 'redes-sociais',
      });

      await expect(
        repository.findSiblingBySlug('redes-sociais', 'org-1', null),
      ).resolves.toEqual({ id: 'c1', slug: 'redes-sociais' });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          slug: 'redes-sociais',
          parentId: null,
          isDeleted: false,
        },
        select: { id: true, slug: true },
      });
    });

    it('deve buscar irmão com mesmo pai e excluir id quando informado', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await repository.findSiblingBySlug(
        'filho',
        'org-1',
        'parent-id',
        'cat-1',
      );

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          slug: 'filho',
          parentId: 'parent-id',
          isDeleted: false,
          id: { not: 'cat-1' },
        },
        select: { id: true, slug: true },
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.category.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findSiblingBySlug('s', 'org', null),
      ).rejects.toThrow('Erro ao buscar categoria por slug');
    });
  });

  describe('findTreeBySlugPath', () => {
    it('deve lançar quando não houver linhas do raw query', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(
        repository.findTreeBySlugPath('slug', 'org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        repository.findTreeBySlugPath('slug', 'org-1', 'user-1'),
      ).rejects.toThrow('Você não tem acesso a esta categoria');
    });

    it('deve retornar path e tree quando o raw query retornar dados', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          type: 'path',
          data: [
            { id: 'root', name: 'Root', slug: 'root', parentId: null },
          ],
        },
        {
          type: 'tree',
          data: [
            { id: 'root', name: 'Root', slug: 'root', parentId: null },
          ],
        },
      ]);

      const out = await repository.findTreeBySlugPath(
        'root',
        'org-1',
        'user-1',
      );

      expect(out.path).toEqual([
        { id: 'root', name: 'Root', slug: 'root' },
      ]);
      expect(out.tree).toMatchObject({
        id: 'root',
        name: 'Root',
        slug: 'root',
        children: [],
      });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalled();
    });

    it('deve usar arrays vazios quando path ou tree não vierem no resultado', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        { type: 'path' },
        { type: 'tree', data: null },
      ]);

      const out = await repository.findTreeBySlugPath('s', 'org-1', 'user-1');

      expect(out.path).toEqual([]);
      expect(out.tree).toBeNull();
    });

    it('deve montar tree com pai e filho no buildTree', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          type: 'path',
          data: [
            { id: 'root', name: 'Root', slug: 'root', parentId: null },
            { id: 'leaf', name: 'Leaf', slug: 'leaf', parentId: 'root' },
          ],
        },
        {
          type: 'tree',
          data: [
            { id: 'root', name: 'Root', slug: 'root', parentId: null },
            { id: 'leaf', name: 'Leaf', slug: 'leaf', parentId: 'root' },
          ],
        },
      ]);

      const out = await repository.findTreeBySlugPath(
        'leaf',
        'org-1',
        'user-1',
      );

      expect(out.tree).toMatchObject({
        id: 'root',
        children: expect.arrayContaining([
          expect.objectContaining({
            id: 'leaf',
            slug: 'leaf',
            children: [],
          }),
        ]),
      });
    });
  });

  describe('findSiblingByOrder', () => {
    it('deve buscar irmão com mesma ordem no mesmo nível (raiz)', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: 'c1', order: 5 });

      await expect(
        repository.findSiblingByOrder(5, 'org-1', null),
      ).resolves.toEqual({
        id: 'c1',
        order: 5,
      });

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          order: 5,
          parentId: null,
          isDeleted: false,
        },
        select: { id: true, order: true },
      });
    });

    it('deve buscar irmão com mesmo pai e excluir id quando informado', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await repository.findSiblingByOrder(2, 'org-1', 'parent-id', 'cat-1');

      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          order: 2,
          parentId: 'parent-id',
          isDeleted: false,
          id: { not: 'cat-1' },
        },
        select: { id: true, order: true },
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.category.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findSiblingByOrder(1, 'org', null),
      ).rejects.toThrow('Erro ao buscar categoria por ordem');
    });
  });

  describe('findHierarchyReferences', () => {
    it('deve retornar id e parentId', async () => {
      const refs = [
        { id: 'a', parentId: null },
        { id: 'b', parentId: 'a' },
      ];
      prisma.category.findMany.mockResolvedValue(refs);

      await expect(
        repository.findHierarchyReferences('org-1'),
      ).resolves.toEqual(refs);
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findHierarchyReferences('org-1'),
      ).rejects.toThrow('Erro ao buscar hierarquia de categorias');
    });
  });

  describe('countChildren', () => {
    it('deve delegar ao count do prisma', async () => {
      prisma.category.count.mockResolvedValue(3);

      await expect(
        repository.countChildren('parent-id', 'org-1'),
      ).resolves.toBe(3);

      expect(prisma.category.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          parentId: 'parent-id',
          isDeleted: false,
        },
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.category.count.mockRejectedValue(new Error('db'));

      await expect(
        repository.countChildren('p', 'org'),
      ).rejects.toThrow('Erro ao contar subcategorias');
    });
  });

  describe('create', () => {
    it('deve criar com generateId e defaults', async () => {
      prisma.category.create.mockResolvedValue({} as never);

      await repository.create(
        'org-1',
        {
          name: 'Nome',
          slug: 'nome',
          slugPath: 'nome',
          order: 1,
        },
        'user-1',
      );

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: {
          id: 'generated-category-id',
          organizationId: 'org-1',
          name: 'Nome',
          slug: 'nome',
          slugPath: 'nome',
          order: 1,
          isActive: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Categoria criada',
        expect.objectContaining({ organizationId: 'org-1', userId: 'user-1' }),
      );
    });

    it('deve incluir parentId quando informado', async () => {
      prisma.category.create.mockResolvedValue({} as never);

      await repository.create(
        'org-1',
        {
          name: 'Filho',
          slug: 'filho',
          slugPath: 'pai/filho',
          order: 2,
          parentId: 'pai-id',
        },
        'user-1',
      );

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: 'pai-id',
          slugPath: 'pai/filho',
        }),
      });
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.category.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create(
          'org-1',
          { name: 'x', slug: 'x', slugPath: 'x', order: 0 },
          'user-1',
        ),
      ).rejects.toThrow('Erro ao criar categoria');
    });
  });

  describe('update', () => {
    it('deve aplicar apenas campos definidos', async () => {
      prisma.category.update.mockResolvedValue({} as never);

      await repository.update(
        'cid',
        'org-1',
        { name: 'Novo', isActive: false },
        'user-1',
      );

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cid', organizationId: 'org-1', isDeleted: false },
        data: { name: 'Novo', isActive: false },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve incluir slug, order, parentId e slugPath quando informados', async () => {
      prisma.category.update.mockResolvedValue({} as never);
      prisma.category.findMany.mockResolvedValue([]);

      await repository.update(
        'cid',
        'org-1',
        {
          slug: 'novo-slug',
          order: 5,
          parentId: 'pai-id',
          slugPath: 'pai-id/novo-slug',
        },
        'user-1',
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cid', organizationId: 'org-1', isDeleted: false },
        data: {
          slug: 'novo-slug',
          order: 5,
          parentId: 'pai-id',
          slugPath: 'pai-id/novo-slug',
        },
      });
    });

    it('deve recalcular slugPath dos descendentes quando slugPath mudar', async () => {
      prisma.category.update.mockResolvedValue({} as never);
      prisma.category.findMany
        .mockResolvedValueOnce([{ id: 'child-1', slug: 'filho' }])
        .mockResolvedValueOnce([]);

      await repository.update(
        'parent-id',
        'org-1',
        { slugPath: 'novo-pai' },
        'user-1',
      );

      expect(prisma.category.update).toHaveBeenCalledTimes(2);
      expect(prisma.category.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'child-1' },
        data: { slugPath: 'novo-pai/filho' },
      });
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.category.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('cid', 'org-1', { name: 'x' }, 'user-1'),
      ).rejects.toThrow('Erro ao atualizar categoria');
    });
  });

  describe('delete', () => {
    it('deve marcar a categoria e descendentes como deletadas', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: 'root', parentId: null },
        { id: 'c1', parentId: 'root' },
        { id: 'c2', parentId: 'c1' },
      ]);
      prisma.category.updateMany.mockResolvedValue({ count: 3 } as never);

      await repository.delete('root', 'org-1', 'user-1');

      expect(prisma.category.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: expect.arrayContaining(['root', 'c1', 'c2']) },
          organizationId: 'org-1',
          isDeleted: false,
        },
        data: {
          isActive: false,
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Categoria removida',
        expect.objectContaining({ deletedCount: 3 }),
      );
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.category.findMany.mockResolvedValue([{ id: 'x', parentId: null }]);
      prisma.category.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.delete('x', 'org-1', 'user-1'),
      ).rejects.toThrow('Erro ao remover categoria');
    });

    it('deve ignorar shift indefinido na fila quando id for string vazia', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: '', parentId: null },
      ]);
      prisma.category.updateMany.mockResolvedValue({ count: 1 } as never);

      await repository.delete('', 'org-1', 'user-1');

      expect(prisma.category.updateMany).toHaveBeenCalled();
    });
  });
});
