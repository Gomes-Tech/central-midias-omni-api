import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { MaterialRepository } from './material.repository';

function createPrismaMock() {
  return {
    material: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    materialFile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    member: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
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
    it('deve usar filtros padrão quando filters não for informado', async () => {
      prisma.material.findMany.mockResolvedValue([]);
      prisma.material.count.mockResolvedValue(0);

      await repository.findAll(undefined as never, 'org-id');

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
        },
        select: expect.any(Object),
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 25,
      });
    });

    it('deve buscar materiais no escopo da organização e mapear contagem de arquivos', async () => {
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-id',
          name: 'Material institucional',
          description: 'Descricao',
          category: {
            name: 'Categoria',
          },
          materialFiles: [{ id: 'file-1' }, { id: 'file-2' }],
        },
      ]);
      prisma.material.count.mockResolvedValue(1);

      const result = await repository.findAll(
        {
          categoryId: 'category-id',
          searchTerm: 'inst',
        },
        'org-id',
      );

      expect(result).toEqual({
        data: [
          {
            id: 'material-id',
            name: 'Material institucional',
            description: 'Descricao',
            category: {
              name: 'Categoria',
            },
            materialFilesCount: 2,
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });
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
        skip: 0,
        take: 25,
      });
      expect(prisma.material.count).toHaveBeenCalledWith({
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
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.material.findMany.mockRejectedValue(new Error('db'));
      prisma.material.count.mockResolvedValue(0);

      await expect(repository.findAll({}, 'org-id')).rejects.toThrow(
        'Erro ao buscar materiais',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'MaterialRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-id' }),
      );
    });
  });

  describe('search', () => {
    it('deve retornar vazio quando term não for informado', async () => {
      const result = await repository.search('org-id', 'user-id', {});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      expect(prisma.member.findFirst).not.toHaveBeenCalled();
      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it('deve retornar vazio quando term for apenas espaços', async () => {
      const result = await repository.search('org-id', 'user-id', {
        term: '   ',
      });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      expect(prisma.member.findFirst).not.toHaveBeenCalled();
    });

    it('deve retornar vazio quando usuário não for membro nem admin global', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);

      const result = await repository.search('org-id', 'user-id', {
        term: 'campanha',
      });

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it('deve buscar materiais com filtro por role do membro', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-id',
          name: 'Material campanha',
          description: 'Descricao',
          category: { name: 'Categoria' },
          materialFiles: [{ id: 'file-1' }],
        },
      ]);
      prisma.material.count.mockResolvedValue(1);

      const result = await repository.search('org-id', 'user-id', {
        term: 'campanha',
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({
        data: [
          {
            id: 'material-id',
            name: 'Material campanha',
            description: 'Descricao',
            category: { name: 'Categoria' },
            materialFilesCount: 1,
          },
        ],
        total: 1,
        page: 2,
        totalPages: 1,
      });
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
            OR: [
              { categoryRoleAccesses: { none: {} } },
              {
                categoryRoleAccesses: {
                  some: { roleId: 'role-1', organizationId: 'org-id' },
                },
              },
            ],
          },
          OR: [
            { name: { contains: 'campanha', mode: 'insensitive' } },
            {
              tags: {
                some: {
                  organizationId: 'org-id',
                  name: { contains: 'campanha', mode: 'insensitive' },
                },
              },
            },
          ],
        },
        select: expect.any(Object),
        orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
        skip: 10,
        take: 10,
      });
    });

    it('deve buscar sem filtro de role para admin global', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue({
        globalRole: {
          name: 'ADMIN',
          canAccessBackoffice: true,
        },
      });
      prisma.material.findMany.mockResolvedValue([]);
      prisma.material.count.mockResolvedValue(0);

      await repository.search('org-id', 'admin-id', { term: 'video' });

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            category: {
              organizationId: 'org-id',
              isDeleted: false,
            },
            OR: [
              { name: { contains: 'video', mode: 'insensitive' } },
              {
                tags: {
                  some: {
                    organizationId: 'org-id',
                    name: { contains: 'video', mode: 'insensitive' },
                  },
                },
              },
            ],
          },
        }),
      );
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockRejectedValue(new Error('db'));
      prisma.material.count.mockResolvedValue(0);

      await expect(
        repository.search('org-id', 'user-id', { term: 'campanha' }),
      ).rejects.toThrow('Erro ao buscar materiais');
      expect(logger.error).toHaveBeenCalledWith(
        'MaterialRepository.search falhou',
        expect.objectContaining({
          organizationId: 'org-id',
          userId: 'user-id',
          term: 'campanha',
        }),
      );
    });
  });

  describe('findAllSelect', () => {
    it('deve listar materiais ativos retornando id e name', async () => {
      prisma.material.findMany.mockResolvedValue([
        { id: 'material-id', name: 'Material' },
      ]);

      await expect(repository.findAllSelect('org-id')).resolves.toEqual([
        { id: 'material-id', name: 'Material' },
      ]);
      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
        },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.material.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAllSelect('org-id')).rejects.toThrow(
        'Erro ao buscar materiais (select)',
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
        tags: [{ id: 'tag-id', name: 'Campanha' }],
        materialFiles: [],
      });

      await expect(
        repository.findById('material-id', 'org-id'),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 'material-id',
          deletedAt: null,
          tags: ['tag-id'],
        }),
      );
    });

    it('deve retornar null quando material não existir', async () => {
      prisma.material.findFirst.mockResolvedValue(null);

      await expect(
        repository.findById('material-id', 'org-id'),
      ).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.material.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findById('material-id', 'org-id'),
      ).rejects.toThrow('Erro ao buscar material');
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

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.material.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findByName('Material', 'category-id'),
      ).rejects.toThrow('Erro ao buscar material');
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
          {
            tags: {
              existingTagIds: [],
              newTagNames: ['Campanha'],
            },
          },
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          name: 'Material institucional',
          description: 'Descricao',
          categoryId: 'category-id',
          tags: {
            connectOrCreate: [
              {
                where: {
                  organizationId_name: {
                    organizationId: 'org-id',
                    name: 'Campanha',
                  },
                },
                create: {
                  id: 'mocked-uuid',
                  organizationId: 'org-id',
                  name: 'Campanha',
                },
              },
            ],
          },
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

    it('deve criar material sem bloco de tags quando options.tags não for informado', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await repository.create(
        'org-id',
        {
          name: 'Material',
          categoryId: 'category-id',
        },
        'user-id',
      );

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          name: 'Material',
          description: null,
          categoryId: 'category-id',
        },
        select: { id: true },
      });
    });

    it('deve omitir tags no create quando resolved tags vier vazio', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await repository.create(
        'org-id',
        {
          name: 'Material',
          categoryId: 'category-id',
        },
        'user-id',
        {
          tags: {
            existingTagIds: [],
            newTagNames: [],
          },
        },
      );

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          name: 'Material',
          description: null,
          categoryId: 'category-id',
        },
        select: { id: true },
      });
    });

    it('deve conectar tags existentes sem criar novas', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await repository.create(
        'org-id',
        {
          name: 'Material',
          categoryId: 'category-id',
        },
        'user-id',
        {
          tags: {
            existingTagIds: ['tag-id'],
            newTagNames: [],
          },
        },
      );

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tags: {
            connect: [{ id: 'tag-id' }],
          },
        }),
        select: { id: true },
      });
    });

    it('deve criar material com id informado e arquivos relacionados', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await expect(
        repository.create(
          'org-id',
          {
            name: 'Material institucional',
            description: 'Descricao',
            categoryId: 'category-id',
            tags: ['Campanha'],
          },
          'user-id',
          {
            id: 'material-id',
            files: [
              {
                fileKey: 'materials/material-id/file.pdf',
                mimeType: 'application/pdf',
                size: 1024,
              },
            ],
            tags: {
              existingTagIds: [],
              newTagNames: ['Campanha'],
            },
          },
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          id: 'material-id',
          name: 'Material institucional',
          description: 'Descricao',
          categoryId: 'category-id',
          tags: {
            connectOrCreate: [
              {
                where: {
                  organizationId_name: {
                    organizationId: 'org-id',
                    name: 'Campanha',
                  },
                },
                create: {
                  id: 'mocked-uuid',
                  organizationId: 'org-id',
                  name: 'Campanha',
                },
              },
            ],
          },
          materialFiles: {
            create: [
              {
                id: 'mocked-uuid',
                imageKey: 'materials/material-id/file.pdf',
                mimeType: 'application/pdf',
                size: 1024,
              },
            ],
          },
        },
        select: {
          id: true,
        },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar campos informados no escopo da organização', async () => {
      prisma.material.findFirst.mockResolvedValue({ id: 'material-id' });
      prisma.material.update.mockResolvedValue({ id: 'material-id' });

      await expect(
        repository.update(
          'material-id',
          'org-id',
          {
            name: 'Novo nome',
            categoryId: 'other-category',
            tags: ['Campanha', 'Novo'],
          },
          'user-id',
          {
            tags: {
              existingTagIds: ['tag-id'],
              newTagNames: ['Novo'],
            },
          },
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'material-id',
          deletedAt: null,
          category: {
            organizationId: 'org-id',
            isDeleted: false,
          },
        },
        select: {
          id: true,
        },
      });
      expect(prisma.material.update).toHaveBeenCalledWith({
        where: {
          id: 'material-id',
        },
        data: {
          name: 'Novo nome',
          categoryId: 'other-category',
          tags: {
            set: [],
            connect: [{ id: 'tag-id' }],
            connectOrCreate: [
              {
                where: {
                  organizationId_name: {
                    organizationId: 'org-id',
                    name: 'Novo',
                  },
                },
                create: {
                  id: 'mocked-uuid',
                  organizationId: 'org-id',
                  name: 'Novo',
                },
              },
            ],
          },
        },
      });
    });

    it('deve limpar tags quando o payload vier vazio', async () => {
      prisma.material.findFirst.mockResolvedValue({ id: 'material-id' });
      prisma.material.update.mockResolvedValue({ id: 'material-id' });

      await expect(
        repository.update(
          'material-id',
          'org-id',
          {
            tags: [],
          },
          'user-id',
          {
            tags: {
              existingTagIds: [],
              newTagNames: [],
            },
          },
        ),
      ).resolves.toBe(undefined);

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: {
          id: 'material-id',
        },
        data: {
          tags: {
            set: [],
          },
        },
      });
    });

    it('deve retornar cedo quando material não existir no escopo', async () => {
      prisma.material.findFirst.mockResolvedValue(null);

      await expect(
        repository.update(
          'material-id',
          'org-id',
          { name: 'Novo' },
          'user-id',
        ),
      ).resolves.toBeUndefined();
      expect(prisma.material.update).not.toHaveBeenCalled();
    });

    it('deve atualizar apenas description quando informada', async () => {
      prisma.material.findFirst.mockResolvedValue({ id: 'material-id' });
      prisma.material.update.mockResolvedValue({ id: 'material-id' });

      await repository.update(
        'material-id',
        'org-id',
        { description: 'Nova descrição' },
        'user-id',
      );

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material-id' },
        data: { description: 'Nova descrição' },
      });
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.material.findFirst.mockResolvedValue({ id: 'material-id' });
      prisma.material.update.mockRejectedValue(new Error('db'));

      await expect(
        repository.update(
          'material-id',
          'org-id',
          { name: 'Novo' },
          'user-id',
        ),
      ).rejects.toThrow('Erro ao atualizar material');
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

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.material.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.delete('material-id', 'org-id', 'user-id'),
      ).rejects.toThrow('Erro ao remover material');
    });
  });

  describe('createFiles', () => {
    it('deve criar arquivos do material e mapear imageKey para fileKey', async () => {
      prisma.materialFile.create.mockResolvedValue({
        id: 'file-id',
        materialId: 'material-id',
        imageKey: 'materials/material-id/file.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      await expect(
        repository.createFiles(
          'material-id',
          'org-id',
          [
            {
              fileKey: 'materials/material-id/file.pdf',
              mimeType: 'application/pdf',
              size: 1024,
            },
          ],
          'user-id',
        ),
      ).resolves.toEqual([
        {
          id: 'file-id',
          materialId: 'material-id',
          fileKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ]);

      expect(prisma.materialFile.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          materialId: 'material-id',
          imageKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
        select: {
          id: true,
          materialId: true,
          imageKey: true,
          mimeType: true,
          size: true,
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Arquivos de material criados',
        expect.objectContaining({
          materialId: 'material-id',
          filesCount: 1,
        }),
      );
    });

    it('deve lançar BadRequest quando create de arquivo falhar', async () => {
      prisma.materialFile.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.createFiles(
          'material-id',
          'org-id',
          [
            {
              fileKey: 'materials/material-id/file.pdf',
              mimeType: 'application/pdf',
              size: 1024,
            },
          ],
          'user-id',
        ),
      ).rejects.toThrow('Erro ao salvar arquivos do material');
    });
  });

  describe('findFilesByMaterialId', () => {
    it('deve buscar arquivos no escopo da organização', async () => {
      prisma.materialFile.findMany.mockResolvedValue([
        {
          id: 'file-id',
          materialId: 'material-id',
          imageKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ]);

      await expect(
        repository.findFilesByMaterialId('material-id', 'org-id'),
      ).resolves.toEqual([
        {
          id: 'file-id',
          materialId: 'material-id',
          fileKey: 'materials/material-id/file.pdf',
          mimeType: 'application/pdf',
          size: 1024,
        },
      ]);

      expect(prisma.materialFile.findMany).toHaveBeenCalledWith({
        where: {
          materialId: 'material-id',
          material: {
            deletedAt: null,
            category: {
              organizationId: 'org-id',
              isDeleted: false,
            },
          },
        },
        select: expect.any(Object),
        orderBy: {
          id: 'asc',
        },
      });
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.materialFile.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findFilesByMaterialId('material-id', 'org-id'),
      ).rejects.toThrow('Erro ao buscar arquivos do material');
    });
  });

  describe('findFileById', () => {
    it('deve buscar arquivo por id no escopo do material', async () => {
      prisma.materialFile.findFirst.mockResolvedValue({
        id: 'file-id',
        materialId: 'material-id',
        imageKey: 'materials/material-id/file.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      await expect(
        repository.findFileById('file-id', 'material-id', 'org-id'),
      ).resolves.toEqual({
        id: 'file-id',
        materialId: 'material-id',
        fileKey: 'materials/material-id/file.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });
    });

    it('deve retornar null quando arquivo não existir', async () => {
      prisma.materialFile.findFirst.mockResolvedValue(null);

      await expect(
        repository.findFileById('file-id', 'material-id', 'org-id'),
      ).resolves.toBeNull();
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.materialFile.findFirst.mockRejectedValue(new Error('db'));

      await expect(
        repository.findFileById('file-id', 'material-id', 'org-id'),
      ).rejects.toThrow('Erro ao buscar arquivo do material');
    });
  });

  describe('deleteFile', () => {
    it('deve remover arquivo no escopo da organização', async () => {
      prisma.materialFile.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.deleteFile('file-id', 'material-id', 'org-id', 'user-id'),
      ).resolves.toBe(undefined);

      expect(prisma.materialFile.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'file-id',
          materialId: 'material-id',
          material: {
            deletedAt: null,
            category: {
              organizationId: 'org-id',
              isDeleted: false,
            },
          },
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Arquivo de material removido',
        expect.objectContaining({
          fileId: 'file-id',
          materialId: 'material-id',
        }),
      );
    });

    it('deve lançar BadRequest quando deleteMany falhar', async () => {
      prisma.materialFile.deleteMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.deleteFile('file-id', 'material-id', 'org-id', 'user-id'),
      ).rejects.toThrow('Erro ao remover arquivo do material');
    });
  });
});
