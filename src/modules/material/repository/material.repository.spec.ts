import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { MaterialRepository } from './material.repository';

function createPrismaMock() {
  return {
    material: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('MaterialRepository', () => {
  let repository: MaterialRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new MaterialRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve buscar materiais no escopo da organização e mapear contagem de arquivos', async () => {
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-id',
          name: 'Material institucional',
          description: 'Descricao',
          categoryId: 'category-id',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          category: {
            id: 'category-id',
            name: 'Categoria',
            slug: 'categoria',
          },
          _count: {
            materialFiles: 2,
          },
        },
      ]);

      const result = await repository.findAll('org-id', {
        categoryId: 'category-id',
        searchTerm: 'inst',
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'material-id',
          materialFilesCount: 2,
        }),
      ]);
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
          categoryId: 'category-id',
          OR: [
            { name: { contains: 'inst', mode: 'insensitive' } },
            { description: { contains: 'inst', mode: 'insensitive' } },
          ],
        },
        select: expect.any(Object),
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.material.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll('org-id')).rejects.toThrow(
        'Erro ao buscar materiais',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'MaterialRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-id' }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar o material detalhado quando existir', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        name: 'Material institucional',
        description: 'Descricao',
        categoryId: 'category-id',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        deletedAt: null,
        category: {
          id: 'category-id',
          name: 'Categoria',
          slug: 'categoria',
        },
        _count: {
          materialFiles: 0,
        },
      });

      await expect(repository.findById('material-id', 'org-id')).resolves.toEqual(
        expect.objectContaining({
          id: 'material-id',
          deletedAt: null,
        }),
      );
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.material.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findById('material-id', 'org-id')).rejects.toThrow(
        'Erro ao buscar material',
      );
    });
  });

  describe('findByName', () => {
    it('deve buscar nome na categoria ignorando removidos', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        name: 'Material institucional',
        categoryId: 'category-id',
      });

      await expect(
        repository.findByName('Material institucional', 'category-id'),
      ).resolves.toEqual({
        id: 'material-id',
        name: 'Material institucional',
        categoryId: 'category-id',
      });

      expect(prisma.material.findFirst).toHaveBeenCalledWith({
        where: {
          name: 'Material institucional',
          categoryId: 'category-id',
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
        },
      });
    });
  });

  describe('create', () => {
    it('deve criar material e registrar log', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await expect(
        repository.create(
          'org-id',
          {
            name: 'Material institucional',
            description: 'Descricao',
            categoryId: 'category-id',
          },
          'user-id',
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          name: 'Material institucional',
          description: 'Descricao',
          categoryId: 'category-id',
        },
        select: {
          id: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Material criado',
        expect.objectContaining({
          materialId: 'material-id',
          organizationId: 'org-id',
        }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.material.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create(
          'org-id',
          {
            name: 'Material institucional',
            categoryId: 'category-id',
          },
          'user-id',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve atualizar campos informados no escopo da organização', async () => {
      prisma.material.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.update(
          'material-id',
          'org-id',
          {
            name: 'Novo nome',
            categoryId: 'other-category',
          },
          'user-id',
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'material-id',
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
        },
        data: {
          name: 'Novo nome',
          categoryId: 'other-category',
        },
      });
    });
  });

  describe('delete', () => {
    it('deve aplicar soft delete', async () => {
      prisma.material.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.delete('material-id', 'org-id', 'user-id'),
      ).resolves.toBe(undefined);

      expect(prisma.material.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'material-id',
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
        },
        data: {
          deletedAt: expect.any(Date),
        },
      });
    });
  });
});
