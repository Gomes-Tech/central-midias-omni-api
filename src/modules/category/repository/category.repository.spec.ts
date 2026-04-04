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
    $queryRawUnsafe: jest.fn(),
  };
}

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
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
    it('deve agrupar filhos sob o pai na árvore', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'p1',
          name: 'Pai',
          slug: 'pai',
          isActive: true,
          order: 0,
          parentId: null,
        },
        {
          id: 'f1',
          name: 'Filho',
          slug: 'filho',
          isActive: true,
          order: 1,
          parentId: 'p1',
        },
      ]);

      const tree = await repository.findTree('org-1', 'user-1');

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('p1');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('f1');
      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            isDeleted: false,
          }),
        }),
      );
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.category.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findTree('org-1', 'u1')).rejects.toThrow(
        'Erro ao buscar árvore de categorias',
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('deve ignorar nó quando get do mapa não retornar valor (defensivo)', async () => {
      prisma.category.findMany.mockResolvedValue([
        {
          id: 'a',
          name: 'A',
          slug: 'a',
          isActive: true,
          order: 0,
          parentId: null,
        },
      ]);

      const originalGet = Map.prototype.get;
      const spy = jest
        .spyOn(Map.prototype, 'get')
        .mockImplementation(function (this: Map<string, unknown>, key: unknown) {
          if (key === 'a') {
            return undefined;
          }
          return originalGet.call(this, key as string);
        });

      try {
        const tree = await repository.findTree('org-1', 'u1');
        expect(tree).toEqual([]);
      } finally {
        spy.mockRestore();
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

  describe('findBySlug', () => {
    it('deve buscar por organizationId_slug', async () => {
      prisma.category.findUnique.mockResolvedValue({
        id: 'c1',
        slug: 'meu-slug',
      });

      await expect(
        repository.findBySlug('meu-slug', 'org-1'),
      ).resolves.toEqual({ id: 'c1', slug: 'meu-slug' });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          organizationId_slug: { organizationId: 'org-1', slug: 'meu-slug' },
        },
        select: { id: true, slug: true },
      });
    });

    it('deve lançar BadRequest quando findUnique falhar', async () => {
      prisma.category.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findBySlug('s', 'org')).rejects.toThrow(
        'Erro ao buscar categoria',
      );
    });
  });

  describe('findTreeBySlug', () => {
    it('deve lançar quando não houver linhas do raw query', async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await expect(
        repository.findTreeBySlug('slug', 'org-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);

      await expect(
        repository.findTreeBySlug('slug', 'org-1', 'user-1'),
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

      const out = await repository.findTreeBySlug(
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

      const out = await repository.findTreeBySlug('s', 'org-1', 'user-1');

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

      const out = await repository.findTreeBySlug(
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

  describe('findByOrder', () => {
    it('deve buscar por organizationId_order', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'c1', order: 5 });

      await expect(repository.findByOrder(5, 'org-1')).resolves.toEqual({
        id: 'c1',
        order: 5,
      });

      expect(prisma.category.findUnique).toHaveBeenCalledWith({
        where: {
          isDeleted: false,
          organizationId_order: { organizationId: 'org-1', order: 5 },
        },
        select: { id: true, order: true },
      });
    });

    it('deve lançar BadRequest quando falhar', async () => {
      prisma.category.findUnique.mockRejectedValue(new Error('db'));

      await expect(repository.findByOrder(1, 'org')).rejects.toThrow(
        'Erro ao buscar categoria por ordem',
      );
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
          order: 2,
          parentId: 'pai-id',
        },
        'user-1',
      );

      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentId: 'pai-id' }),
      });
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.category.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create(
          'org-1',
          { name: 'x', slug: 'x', order: 0 },
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

    it('deve incluir slug, order e parentId quando informados', async () => {
      prisma.category.update.mockResolvedValue({} as never);

      await repository.update(
        'cid',
        'org-1',
        {
          slug: 'novo-slug',
          order: 5,
          parentId: 'pai-id',
        },
        'user-1',
      );

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cid', organizationId: 'org-1', isDeleted: false },
        data: {
          slug: 'novo-slug',
          order: 5,
          parentId: 'pai-id',
        },
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
