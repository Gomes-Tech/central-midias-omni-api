import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { TagRepository } from './tag.repository';

function createPrismaMock() {
  return {
    tag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

describe('TagRepository', () => {
  const organizationId = 'organization-id';
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
          organizationId,
          name: 'Campanha',
          createdAt: new Date('2024-01-01T00:00:00.000Z'),
          updatedAt: new Date('2024-01-02T00:00:00.000Z'),
          _count: {
            material: 2,
            tagSearches: 1,
          },
        },
      ]);

      const result = await repository.findAll(organizationId, {
        searchTerm: 'cam',
      });

      expect(result).toEqual([
        expect.objectContaining({
          id: 'tag-id',
          organizationId,
          materialsCount: 2,
          tagSearchesCount: 1,
        }),
      ]);
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
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

      await expect(repository.findAll(organizationId)).rejects.toThrow(
        'Erro ao buscar tags',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findAll falhou',
        expect.objectContaining({ filters: {}, organizationId }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar a tag quando existir', async () => {
      prisma.tag.findFirst.mockResolvedValue({
        id: 'tag-id',
        organizationId,
        name: 'Campanha',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(
        repository.findById('tag-id', organizationId),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 'tag-id',
          organizationId,
          name: 'Campanha',
        }),
      );
      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: { id: 'tag-id', organizationId },
        select: expect.any(Object),
      });
    });

    it('deve retornar null quando a tag não existir', async () => {
      prisma.tag.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('tag-id', organizationId),
      ).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.tag.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findById('tag-id', organizationId),
      ).rejects.toThrow('Erro ao buscar tag');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findById falhou',
        expect.objectContaining({ id: 'tag-id', organizationId }),
      );
    });
  });

  describe('findSelect', () => {
    it('deve listar tags da organização retornando apenas id e name', async () => {
      const rows = [
        { id: 'tag-1', name: 'Campanha' },
        { id: 'tag-2', name: 'Institucional' },
      ];
      prisma.tag.findMany.mockResolvedValue(rows);

      const result = await repository.findSelect(organizationId);

      expect(result).toEqual(rows);
      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: { organizationId },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.tag.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findSelect(organizationId)).rejects.toThrow(
        BadRequestException,
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findSelect falhou',
        expect.objectContaining({ organizationId }),
      );
    });
  });

  describe('findByName', () => {
    it('deve buscar por nome sem diferenciar caixa', async () => {
      prisma.tag.findFirst.mockResolvedValue({
        id: 'tag-id',
        name: 'Campanha',
      });

      await expect(
        repository.findByName('campanha', organizationId),
      ).resolves.toEqual({
        id: 'tag-id',
        name: 'Campanha',
      });

      expect(prisma.tag.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId,
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

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.tag.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByName('campanha', organizationId),
      ).rejects.toThrow('Erro ao buscar tag');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findByName falhou',
        expect.objectContaining({ name: 'campanha', organizationId }),
      );
    });
  });

  describe('findManyByIds', () => {
    it('deve retornar array vazio quando não houver ids', async () => {
      await expect(repository.findManyByIds([], organizationId)).resolves.toEqual(
        [],
      );
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });

    it('deve buscar por múltiplos ids dentro da organização', async () => {
      prisma.tag.findMany.mockResolvedValue([
        {
          id: 'tag-id',
          name: 'Campanha',
        },
      ]);

      await expect(
        repository.findManyByIds(['tag-id', 'tag-id-2'], organizationId),
      ).resolves.toEqual([
        {
          id: 'tag-id',
          name: 'Campanha',
        },
      ]);

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          id: {
            in: ['tag-id', 'tag-id-2'],
          },
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.tag.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findManyByIds(['tag-id'], organizationId),
      ).rejects.toThrow('Erro ao buscar tags');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findManyByIds falhou',
        expect.objectContaining({
          ids: ['tag-id'],
          organizationId,
        }),
      );
    });
  });

  describe('findManyByNames', () => {
    it('deve retornar array vazio quando não houver nomes', async () => {
      await expect(repository.findManyByNames([], organizationId)).resolves.toEqual(
        [],
      );
      expect(prisma.tag.findMany).not.toHaveBeenCalled();
    });

    it('deve buscar por múltiplos nomes dentro da organização', async () => {
      prisma.tag.findMany.mockResolvedValue([
        {
          id: 'tag-id',
          name: 'Campanha',
        },
      ]);

      await expect(
        repository.findManyByNames(
          ['campanha', 'institucional'],
          organizationId,
        ),
      ).resolves.toEqual([
        {
          id: 'tag-id',
          name: 'Campanha',
        },
      ]);

      expect(prisma.tag.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          OR: [
            {
              name: {
                equals: 'campanha',
                mode: 'insensitive',
              },
            },
            {
              name: {
                equals: 'institucional',
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ name: 'asc' }],
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.tag.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findManyByNames(['campanha'], organizationId),
      ).rejects.toThrow('Erro ao buscar tags');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.findManyByNames falhou',
        expect.objectContaining({
          names: ['campanha'],
          organizationId,
        }),
      );
    });
  });

  describe('create', () => {
    it('deve criar a tag e retornar entidade mapeada', async () => {
      prisma.tag.create.mockResolvedValue({
        id: 'tag-id',
        organizationId,
        name: 'Campanha',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(
        repository.create(organizationId, { name: 'Campanha' }),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 'tag-id',
          organizationId,
          name: 'Campanha',
        }),
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Tag criada',
        expect.objectContaining({ tagId: 'tag-id', organizationId }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.tag.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.create(organizationId, { name: 'Campanha' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update', () => {
    it('deve atualizar a tag', async () => {
      prisma.tag.updateMany.mockResolvedValue({ count: 1 });
      prisma.tag.findFirst.mockResolvedValue({
        id: 'tag-id',
        organizationId,
        name: 'Institucional',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        updatedAt: new Date('2024-01-02T00:00:00.000Z'),
        _count: {
          material: 0,
          tagSearches: 0,
        },
      });

      await expect(
        repository.update('tag-id', organizationId, { name: 'Institucional' }),
      ).resolves.toEqual(
        expect.objectContaining({
          organizationId,
          name: 'Institucional',
        }),
      );
      expect(prisma.tag.updateMany).toHaveBeenCalledWith({
        where: { id: 'tag-id', organizationId },
        data: { name: 'Institucional' },
      });
    });

    it('deve lançar BadRequest quando a tag não for encontrada após update', async () => {
      prisma.tag.updateMany.mockResolvedValue({ count: 1 });
      prisma.tag.findFirst.mockResolvedValue(null);

      await expect(
        repository.update('tag-id', organizationId, { name: 'Institucional' }),
      ).rejects.toThrow('Erro ao atualizar tag');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.update falhou',
        expect.objectContaining({ id: 'tag-id', organizationId }),
      );
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.tag.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('tag-id', organizationId, { name: 'Institucional' }),
      ).rejects.toThrow('Erro ao atualizar tag');
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.update falhou',
        expect.objectContaining({ id: 'tag-id', organizationId }),
      );
    });
  });

  describe('delete', () => {
    it('deve remover a tag', async () => {
      prisma.tag.deleteMany.mockResolvedValue({ count: 1 });

      await expect(repository.delete('tag-id', organizationId)).resolves.toBe(
        undefined,
      );
      expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
        where: { id: 'tag-id', organizationId },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Tag removida',
        expect.objectContaining({ tagId: 'tag-id', organizationId }),
      );
    });

    it('deve lançar BadRequest quando deleteMany falhar', async () => {
      prisma.tag.deleteMany.mockRejectedValue(new Error('db'));

      await expect(repository.delete('tag-id', organizationId)).rejects.toThrow(
        'Erro ao remover tag',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'TagRepository.delete falhou',
        expect.objectContaining({ id: 'tag-id', organizationId }),
      );
    });
  });
});
