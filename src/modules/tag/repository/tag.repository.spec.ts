import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { TagRepository } from './tag.repository';

function createPrismaMock() {
  return {
    tag: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('TagRepository', () => {
  let repository: TagRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new TagRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve buscar tags com filtro opcional e mapear contagens', async () => {
      prisma.tag.findMany.mockResolvedValue([
        {
          id: 'tag-id',
          name: 'Campanha',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          _count: {
            material: 2,
            tagSearches: 1,
          },
        },
      ]);

      const result = await repository.findAll({ searchTerm: 'cam' });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'tag-id',
          materialsCount: 2,
          tagSearchesCount: 1,
        }),
      ]);
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'cam',
            mode: 'insensitive',
          },
        },
        select: expect.any(Object),
        orderBy: [{ name: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.tag.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll()).rejects.toThrow(
        'Erro ao buscar tags',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findAll falhou',
        expect.objectContaining({ filters: {} }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar a tag quando existir', async () => {
      prisma.tag.findUnique.mockResolvedValue({
        id: 'tag-id',
        name: 'Campanha',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(repository.findById('tag-id')).resolves.toEqual(
        expect.objectContaining({
          id: 'tag-id',
          name: 'Campanha',
        }),
      );
    });
  });

  describe('findByName', () => {
    it('deve buscar por nome sem diferenciar caixa', async () => {
      prisma.tag.findFirst.mockResolvedValue({
        id: 'tag-id',
        name: 'Campanha',
      });

      await expect(repository.findByName('campanha')).resolves.toEqual({
        id: 'tag-id',
        name: 'Campanha',
      });

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          name: {
            equals: 'campanha',
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
    });
  });

  describe('create', () => {
    it('deve criar a tag e retornar entidade mapeada', async () => {
      prisma.tag.create.mockResolvedValue({
        id: 'tag-id',
        name: 'Campanha',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(repository.create({ name: 'Campanha' })).resolves.toEqual(
        expect.objectContaining({
          id: 'tag-id',
          name: 'Campanha',
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Tag criada',
        expect.objectContaining({ tagId: 'tag-id' }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.tag.create.mockRejectedValue(new Error('db'));

      await expect(repository.create({ name: 'Campanha' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    it('deve atualizar a tag', async () => {
      prisma.tag.update.mockResolvedValue({
        id: 'tag-id',
        name: 'Institucional',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(
        repository.update('tag-id', { name: 'Institucional' }),
      ).resolves.toEqual(
        expect.objectContaining({
          name: 'Institucional',
        }),
      );
    });
  });

  describe('delete', () => {
    it('deve remover a tag', async () => {
      prisma.tag.delete.mockResolvedValue({ id: 'tag-id' });

      await expect(repository.delete('tag-id')).resolves.toBe(undefined);
      expect(prisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-id' },
      });
    });
  });
});
