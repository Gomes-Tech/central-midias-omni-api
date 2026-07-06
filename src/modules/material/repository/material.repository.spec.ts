import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { MaterialRepository } from './material.repository';

function createPrismaMock() {
  return {
    material: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
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
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    categoryRoleAccess: {
      findMany: jest.fn(),
    },
    materialAcceptance: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    materialView: {
      create: jest.fn(),
    },
    materialDownload: {
      create: jest.fn(),
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
        requiresAcceptance: false,
        hasExternalLink: false,
        externalLink: null,
        isCustomizable: false,
        materialCustomization: null,
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
          isCustomizable: false,
          customization: null,
        }),
      );
    });

    it('deve retornar os dados de customização quando material for personalizável', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        name: 'Material institucional',
        description: 'Descricao',
        categoryId: 'category-id',
        requiresAcceptance: false,
        hasExternalLink: false,
        externalLink: null,
        isCustomizable: true,
        materialCustomization: {
          position: 'TOP',
          hasPhonePrimary: true,
          hasPhoneSecondary: false,
          hasAddress: true,
          hasCity: false,
        },
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
          isCustomizable: true,
          customization: {
            position: 'TOP',
            hasPhonePrimary: true,
            hasPhoneSecondary: false,
            hasAddress: true,
            hasCity: false,
          },
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
          requiresAcceptance: false,
          hasExternalLink: false,
          externalLink: null,
          isCustomizable: false,
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
          requiresAcceptance: false,
          hasExternalLink: false,
          externalLink: null,
          isCustomizable: false,
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
          requiresAcceptance: false,
          hasExternalLink: false,
          externalLink: null,
          isCustomizable: false,
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
          requiresAcceptance: false,
          hasExternalLink: false,
          externalLink: null,
          isCustomizable: false,
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

    it('deve criar customização quando material for personalizável', async () => {
      prisma.material.create.mockResolvedValue({ id: 'material-id' });

      await repository.create(
        'org-id',
        {
          name: 'Material',
          categoryId: 'category-id',
          isCustomizable: true,
          customization: {
            position: 'TOP',
            hasPhonePrimary: true,
            hasAddress: true,
          },
        },
        'user-id',
      );

      expect(prisma.material.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          name: 'Material',
          description: null,
          categoryId: 'category-id',
          requiresAcceptance: false,
          hasExternalLink: false,
          externalLink: null,
          isCustomizable: true,
          materialCustomization: {
            create: {
              id: 'mocked-uuid',
              position: 'TOP',
              hasPhonePrimary: true,
              hasAddress: true,
            },
          },
        },
        select: { id: true },
      });
    });
  });

  describe('update', () => {
    it('deve atualizar campos informados no escopo da organização', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: null,
      });
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
          materialCustomization: {
            select: {
              id: true,
            },
          },
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
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: null,
      });
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
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: null,
      });
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

    it('deve criar ou atualizar customização quando material for personalizável', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: null,
      });
      prisma.material.update.mockResolvedValue({ id: 'material-id' });

      await repository.update(
        'material-id',
        'org-id',
        {
          isCustomizable: true,
          customization: {
            position: 'TOP',
            hasPhonePrimary: true,
          },
        },
        'user-id',
      );

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material-id' },
        data: {
          isCustomizable: true,
          materialCustomization: {
            upsert: {
              create: {
                id: 'mocked-uuid',
                position: 'TOP',
                hasPhonePrimary: true,
              },
              update: {
                position: 'TOP',
                hasPhonePrimary: true,
              },
            },
          },
        },
      });
    });

    it('deve remover customização ao desativar personalização', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: { id: 'customization-id' },
      });
      prisma.material.update.mockResolvedValue({ id: 'material-id' });

      await repository.update(
        'material-id',
        'org-id',
        { isCustomizable: false },
        'user-id',
      );

      expect(prisma.material.update).toHaveBeenCalledWith({
        where: { id: 'material-id' },
        data: {
          isCustomizable: false,
          materialCustomization: {
            delete: true,
          },
        },
      });
    });

    it('deve lançar BadRequest quando update falhar', async () => {
      prisma.material.findFirst.mockResolvedValue({
        id: 'material-id',
        materialCustomization: null,
      });
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

  describe('registerView', () => {
    it('deve criar registro de visualização com materialId e viewedAt', async () => {
      const viewedAt = new Date('2024-06-12T12:00:00.000Z');
      prisma.materialView.create.mockResolvedValue({
        id: 'view-id',
        materialId: 'material-id',
        viewedAt,
      });

      await expect(
        repository.registerView('material-id', viewedAt),
      ).resolves.toBeUndefined();

      expect(prisma.materialView.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          materialId: 'material-id',
          viewedAt,
        },
      });
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.materialView.create.mockRejectedValue(new Error('db'));

      await expect(repository.registerView('material-id')).rejects.toThrow(
        'Erro ao registrar visualização do material',
      );
      expect(logger.error).toHaveBeenCalledWith(
        'MaterialRepository.registerView falhou',
        expect.objectContaining({ materialId: 'material-id' }),
      );
    });
  });

  describe('findMostViewedMaterials', () => {
    const categoryWhere = {
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
    };

    const imageMaterialWhere = {
      deletedAt: null,
      category: categoryWhere,
      materialFiles: {
        some: {
          mimeType: {
            startsWith: 'image/',
          },
        },
      },
    };

    it('deve retornar lista vazia quando usuário não tiver acesso', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        repository.findMostViewedMaterials('org-id', 'user-id', 3),
      ).resolves.toEqual([]);

      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });

    it('deve buscar materiais mais visualizados com imagem e filtro de role', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-1',
          name: 'Material popular 1',
          description: 'Descricao',
          categoryId: 'category-1',
          materialFiles: [],
        },
        {
          id: 'material-2',
          name: 'Material popular 2',
          description: 'Descricao',
          categoryId: 'category-2',
          materialFiles: [],
        },
        {
          id: 'material-3',
          name: 'Material popular 3',
          description: 'Descricao',
          categoryId: 'category-3',
          materialFiles: [],
        },
      ]);

      await expect(
        repository.findMostViewedMaterials('org-id', 'user-id', 3),
      ).resolves.toHaveLength(3);

      expect(prisma.material.findMany).toHaveBeenCalledWith({
        where: {
          ...imageMaterialWhere,
          materialViews: { some: {} },
        },
        orderBy: {
          materialViews: {
            _count: 'desc',
          },
        },
        take: 3,
        select: expect.any(Object),
      });
      expect(prisma.material.groupBy).not.toHaveBeenCalled();
    });

    it('deve buscar fallback com imagens quando não houver materiais visualizados', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValueOnce([]);

      const fallbackSpy = jest
        .spyOn(repository, 'findLatestImageMaterialsPerCategory')
        .mockResolvedValue([
          {
            id: 'fallback-1',
            name: 'Imagem recente',
            description: null,
            categoryId: 'category-a',
            materialFiles: [
              {
                id: 'file-1',
                materialId: 'fallback-1',
                imageKey: 'materials/fallback-1/a.png',
                mimeType: 'image/png',
                size: 1024,
              },
            ],
          },
        ]);

      await expect(
        repository.findMostViewedMaterials('org-id', 'user-id', 3),
      ).resolves.toEqual([
        {
          id: 'fallback-1',
          name: 'Imagem recente',
          description: null,
          categoryId: 'category-a',
          materialFiles: [
            {
              id: 'file-1',
              materialId: 'fallback-1',
              imageKey: 'materials/fallback-1/a.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
      ]);

      expect(fallbackSpy).toHaveBeenCalledWith('org-id', 'user-id', 3, []);
      fallbackSpy.mockRestore();
    });

    it('deve completar com fallback de imagens quando houver menos materiais visualizados que o limite', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValueOnce([
        {
          id: 'material-id',
          name: 'Material popular',
          description: 'Descricao',
          categoryId: 'category-1',
          materialFiles: [],
        },
      ]);

      const fallbackMaterial = {
        id: 'fallback-1',
        name: 'Imagem recente',
        description: null,
        categoryId: 'category-a',
        materialFiles: [
          {
            id: 'file-1',
            materialId: 'fallback-1',
            imageKey: 'materials/fallback-1/a.png',
            mimeType: 'image/png',
            size: 1024,
          },
        ],
      };

      const fallbackSpy = jest
        .spyOn(repository, 'findLatestImageMaterialsPerCategory')
        .mockResolvedValue([fallbackMaterial]);

      await expect(
        repository.findMostViewedMaterials('org-id', 'user-id', 3),
      ).resolves.toEqual([
        {
          id: 'material-id',
          name: 'Material popular',
          description: 'Descricao',
          categoryId: 'category-1',
          materialFiles: [],
        },
        fallbackMaterial,
      ]);

      expect(fallbackSpy).toHaveBeenCalledWith(
        'org-id',
        'user-id',
        2,
        ['material-id'],
      );
      fallbackSpy.mockRestore();
    });
  });

  describe('findLatestMaterialsPerCategory', () => {
    it('deve retornar no máximo um material por categoria e excluir IDs informados', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-1',
          name: 'Mais recente A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [],
        },
        {
          id: 'material-2',
          name: 'Segundo da categoria A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [],
        },
        {
          id: 'material-3',
          name: 'Mais recente B',
          description: null,
          categoryId: 'category-b',
          materialFiles: [],
        },
      ]);

      await expect(
        repository.findLatestMaterialsPerCategory('org-id', 'user-id', 2, [
          'excluded-id',
        ]),
      ).resolves.toEqual([
        {
          id: 'material-1',
          name: 'Mais recente A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [],
        },
        {
          id: 'material-3',
          name: 'Mais recente B',
          description: null,
          categoryId: 'category-b',
          materialFiles: [],
        },
      ]);

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['excluded-id'] },
          }),
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
      );
    });
  });

  describe('findLatestImageMaterialsPerCategory', () => {
    it('deve retornar no máximo um material por categoria com imagem e respeitar limite', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.groupBy.mockResolvedValue([
        {
          categoryId: 'category-a',
          _max: { createdAt: new Date('2024-06-12T12:00:00.000Z') },
        },
        {
          categoryId: 'category-b',
          _max: { createdAt: new Date('2024-06-11T12:00:00.000Z') },
        },
      ]);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-1',
          name: 'Mais recente A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [
            {
              id: 'file-1',
              materialId: 'material-1',
              imageKey: 'materials/material-1/a.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
        {
          id: 'material-3',
          name: 'Mais recente B',
          description: null,
          categoryId: 'category-b',
          materialFiles: [
            {
              id: 'file-3',
              materialId: 'material-3',
              imageKey: 'materials/material-3/b.png',
              mimeType: 'image/jpeg',
              size: 2048,
            },
          ],
        },
      ]);

      await expect(
        repository.findLatestImageMaterialsPerCategory('org-id', 'user-id', 2),
      ).resolves.toEqual([
        {
          id: 'material-1',
          name: 'Mais recente A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [
            {
              id: 'file-1',
              materialId: 'material-1',
              imageKey: 'materials/material-1/a.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
        {
          id: 'material-3',
          name: 'Mais recente B',
          description: null,
          categoryId: 'category-b',
          materialFiles: [
            {
              id: 'file-3',
              materialId: 'material-3',
              imageKey: 'materials/material-3/b.png',
              mimeType: 'image/jpeg',
              size: 2048,
            },
          ],
        },
      ]);

      expect(prisma.material.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['categoryId'],
          where: expect.objectContaining({
            deletedAt: null,
            materialFiles: {
              some: {
                mimeType: {
                  startsWith: 'image/',
                },
              },
            },
            category: expect.objectContaining({
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
            }),
          }),
          orderBy: {
            _max: {
              createdAt: 'desc',
            },
          },
        }),
      );

      expect(prisma.material.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            materialFiles: {
              some: {
                mimeType: {
                  startsWith: 'image/',
                },
              },
            },
            OR: [
              {
                categoryId: 'category-a',
                createdAt: new Date('2024-06-12T12:00:00.000Z'),
              },
              {
                categoryId: 'category-b',
                createdAt: new Date('2024-06-11T12:00:00.000Z'),
              },
            ],
          }),
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('deve retornar materiais de categorias distintas mesmo quando há muitos da mesma categoria', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.groupBy.mockResolvedValue([
        {
          categoryId: 'category-a',
          _max: { createdAt: new Date('2024-06-12T12:00:00.000Z') },
        },
        {
          categoryId: 'category-b',
          _max: { createdAt: new Date('2024-06-11T12:00:00.000Z') },
        },
        {
          categoryId: 'category-c',
          _max: { createdAt: new Date('2024-06-10T12:00:00.000Z') },
        },
      ]);
      prisma.material.findMany.mockResolvedValue([
        {
          id: 'material-a',
          name: 'Categoria A',
          description: null,
          categoryId: 'category-a',
          materialFiles: [
            {
              id: 'file-a',
              materialId: 'material-a',
              imageKey: 'materials/material-a/a.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
        {
          id: 'material-b',
          name: 'Categoria B',
          description: null,
          categoryId: 'category-b',
          materialFiles: [
            {
              id: 'file-b',
              materialId: 'material-b',
              imageKey: 'materials/material-b/b.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
        {
          id: 'material-c',
          name: 'Categoria C',
          description: null,
          categoryId: 'category-c',
          materialFiles: [
            {
              id: 'file-c',
              materialId: 'material-c',
              imageKey: 'materials/material-c/c.png',
              mimeType: 'image/png',
              size: 1024,
            },
          ],
        },
      ]);

      await expect(
        repository.findLatestImageMaterialsPerCategory('org-id', 'user-id', 3),
      ).resolves.toHaveLength(3);

      expect(prisma.material.groupBy).toHaveBeenCalled();
      expect(prisma.material.findMany).toHaveBeenCalledTimes(1);
    });

    it('deve completar com materiais recentes de qualquer categoria quando houver menos categorias que o limite', async () => {
      prisma.member.findFirst.mockResolvedValue({ roleId: 'role-1' });
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.material.groupBy.mockResolvedValue([
        {
          categoryId: 'category-a',
          _max: { createdAt: new Date('2024-06-12T12:00:00.000Z') },
        },
        {
          categoryId: 'category-b',
          _max: { createdAt: new Date('2024-06-11T12:00:00.000Z') },
        },
      ]);
      prisma.material.findMany
        .mockResolvedValueOnce([
          {
            id: 'material-1',
            name: 'Mais recente A',
            description: null,
            categoryId: 'category-a',
            materialFiles: [
              {
                id: 'file-1',
                materialId: 'material-1',
                imageKey: 'materials/material-1/a.png',
                mimeType: 'image/png',
                size: 1024,
              },
            ],
          },
          {
            id: 'material-3',
            name: 'Mais recente B',
            description: null,
            categoryId: 'category-b',
            materialFiles: [
              {
                id: 'file-3',
                materialId: 'material-3',
                imageKey: 'materials/material-3/b.png',
                mimeType: 'image/jpeg',
                size: 2048,
              },
            ],
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'material-2',
            name: 'Segundo da categoria A',
            description: null,
            categoryId: 'category-a',
            materialFiles: [
              {
                id: 'file-2',
                materialId: 'material-2',
                imageKey: 'materials/material-2/a2.png',
                mimeType: 'image/png',
                size: 1024,
              },
            ],
          },
          {
            id: 'material-4',
            name: 'Segundo da categoria B',
            description: null,
            categoryId: 'category-b',
            materialFiles: [
              {
                id: 'file-4',
                materialId: 'material-4',
                imageKey: 'materials/material-4/b2.png',
                mimeType: 'image/png',
                size: 1024,
              },
            ],
          },
        ]);

      await expect(
        repository.findLatestImageMaterialsPerCategory('org-id', 'user-id', 4),
      ).resolves.toEqual([
        expect.objectContaining({ id: 'material-1' }),
        expect.objectContaining({ id: 'material-3' }),
        expect.objectContaining({ id: 'material-2' }),
        expect.objectContaining({ id: 'material-4' }),
      ]);

      expect(prisma.material.findMany).toHaveBeenCalledTimes(2);
      expect(prisma.material.findMany).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: expect.objectContaining({
            id: { notIn: ['material-1', 'material-3'] },
          }),
          orderBy: { createdAt: 'desc' },
          take: 2,
        }),
      );
    });

    it('deve retornar lista vazia quando usuário não tiver acesso a categorias', async () => {
      prisma.member.findFirst.mockResolvedValue(null);
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        repository.findLatestImageMaterialsPerCategory('org-id', 'user-id'),
      ).resolves.toEqual([]);

      expect(prisma.material.findMany).not.toHaveBeenCalled();
    });
  });

  describe('registerDownload', () => {
    it('deve criar registro de download com materialId, userId e downloadedAt', async () => {
      const downloadedAt = new Date('2024-06-12T12:00:00.000Z');
      prisma.materialDownload.create.mockResolvedValue({
        id: 'download-id',
        materialId: 'material-id',
        userId: 'user-id',
        downloadedAt,
      });

      await expect(
        repository.registerDownload('material-id', 'user-id', downloadedAt),
      ).resolves.toBeUndefined();

      expect(prisma.materialDownload.create).toHaveBeenCalledWith({
        data: {
          id: expect.any(String),
          materialId: 'material-id',
          userId: 'user-id',
          downloadedAt,
        },
      });
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.materialDownload.create.mockRejectedValue(new Error('db'));

      await expect(
        repository.registerDownload('material-id', 'user-id'),
      ).rejects.toThrow('Erro ao registrar download do material');
      expect(logger.error).toHaveBeenCalledWith(
        'MaterialRepository.registerDownload falhou',
        expect.objectContaining({
          materialId: 'material-id',
          userId: 'user-id',
        }),
      );
    });
  });

  describe('findPlatformMembersForCategory', () => {
    it('deve filtrar membros da plataforma com acesso à categoria', async () => {
      prisma.categoryRoleAccess.findMany.mockResolvedValue([
        { roleId: 'role-1' },
      ]);
      prisma.member.findMany.mockResolvedValue([
        {
          userId: 'user-1',
          user: { name: 'João', email: 'joao@teste.com' },
        },
      ]);

      await expect(
        repository.findPlatformMembersForCategory('org-id', 'category-id'),
      ).resolves.toEqual([
        { userId: 'user-1', name: 'João', email: 'joao@teste.com' },
      ]);

      expect(prisma.member.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-id',
          role: { canAccessBackoffice: false },
          user: {
            isActive: true,
            isDeleted: false,
            OR: [
              { globalRoleId: null },
              { globalRole: { canAccessBackoffice: false } },
            ],
          },
          roleId: { in: ['role-1'] },
        },
        select: {
          userId: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ user: { name: 'asc' } }],
      });
    });

    it('deve buscar todos os membros da plataforma quando categoria não tiver restrição', async () => {
      prisma.categoryRoleAccess.findMany.mockResolvedValue([]);
      prisma.member.findMany.mockResolvedValue([]);

      await repository.findPlatformMembersForCategory('org-id', 'category-id');

      expect(prisma.member.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-id',
            role: { canAccessBackoffice: false },
          }),
        }),
      );
      expect(prisma.member.findMany.mock.calls[0][0].where).not.toHaveProperty(
        'roleId',
      );
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.categoryRoleAccess.findMany.mockResolvedValue([]);
      prisma.member.findMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.findPlatformMembersForCategory('org-id', 'category-id'),
      ).rejects.toThrow(
        'Erro ao buscar membros da plataforma para notificação do material',
      );
    });
  });
});
