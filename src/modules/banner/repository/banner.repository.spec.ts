import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { makeBanner, makeCreateBannerDTO } from '../use-cases/test-helpers';
import { BannerRepository } from './banner.repository';

function toBannerList(banner: ReturnType<typeof makeBanner>) {
  return {
    id: banner.id,
    name: banner.name,
    link: banner.link,
    order: banner.order,
    isActive: banner.isActive,
    initialDate: banner.initialDate,
    finishDate: banner.finishDate,
  };
}

function createPrismaMock() {
  return {
    banner: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

describe('BannerRepository', () => {
  let repository: BannerRepository;
  let prisma: ReturnType<typeof createPrismaMock>;
  let logger: { error: jest.Mock; info: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    logger = { error: jest.fn(), info: jest.fn() };
    repository = new BannerRepository(
      prisma as unknown as PrismaService,
      logger as unknown as LoggerService,
    );
  });

  describe('findAll', () => {
    it('deve filtrar por organização, não deletados, ativos e ordenar', async () => {
      const rows = [
        makeBanner({ order: 1 }),
        makeBanner({ id: 'b2', order: 2 }),
      ];
      const data = rows.map(toBannerList);

      prisma.banner.findMany.mockResolvedValue(data);
      prisma.banner.count.mockResolvedValue(data.length);

      const result = await repository.findAll({}, 'org-1');

      expect(result).toEqual({
        data,
        total: 2,
        page: 1,
        totalPages: 1,
      });
      expect(prisma.banner.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          link: true,
          order: true,
          isActive: true,
          initialDate: true,
          finishDate: true,
        },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        skip: 0,
        take: 25,
      });
      expect(prisma.banner.count).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          isDeleted: false,
        },
      });
    });

    it('deve filtrar por onlyActive e searchTerm', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(0);

      await repository.findAll(
        { onlyActive: true, searchTerm: 'promo' },
        'org-1',
      );

      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            isDeleted: false,
            isActive: true,
            name: { contains: 'promo', mode: 'insensitive' },
          },
        }),
      );
    });

    it('deve omitir isActive quando onlyActive for false', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(0);

      await repository.findAll({ onlyActive: false }, 'org-1');

      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            isDeleted: false,
          },
        }),
      );
      expect(
        (
          prisma.banner.findMany.mock.calls[0][0].where as {
            isActive?: boolean;
          }
        ).isActive,
      ).toBeUndefined();
    });

    it('deve aplicar filtro só de initialDate quando finishDate não for enviado', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(0);
      const initialDate = new Date('2025-06-15T12:00:00.000Z');

      await repository.findAll({ initialDate }, 'org-1');

      const where = prisma.banner.findMany.mock.calls[0][0].where as {
        AND: unknown[];
      };

      expect(where.AND).toHaveLength(1);
      expect(where.AND[0]).toEqual({
        OR: [{ initialDate: null }, { initialDate: { lte: initialDate } }],
      });
    });

    it('deve aplicar filtro só de finishDate quando initialDate não for enviado', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(0);
      const finishDate = new Date('2025-06-15T12:00:00.000Z');

      await repository.findAll({ finishDate }, 'org-1');

      const where = prisma.banner.findMany.mock.calls[0][0].where as {
        AND: unknown[];
      };

      expect(where.AND).toHaveLength(1);
      expect(where.AND[0]).toEqual({
        OR: [{ finishDate: null }, { finishDate: { gte: finishDate } }],
      });
    });

    it('deve aplicar ambos os filtros de data quando initialDate e finishDate forem enviados', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(0);
      const initialDate = new Date('2025-06-01T00:00:00.000Z');
      const finishDate = new Date('2025-06-30T23:59:59.000Z');

      await repository.findAll({ initialDate, finishDate }, 'org-1');

      const where = prisma.banner.findMany.mock.calls[0][0].where as {
        AND: unknown[];
      };

      expect(where.AND).toHaveLength(2);
      expect(where.AND[0]).toEqual({
        OR: [{ initialDate: null }, { initialDate: { lte: initialDate } }],
      });
      expect(where.AND[1]).toEqual({
        OR: [{ finishDate: null }, { finishDate: { gte: finishDate } }],
      });
    });

    it('deve retornar page do filtro e aplicar skip/take', async () => {
      prisma.banner.findMany.mockResolvedValue([]);
      prisma.banner.count.mockResolvedValue(50);

      const result = await repository.findAll({ page: 2, limit: 10 }, 'org-1');

      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
      expect(prisma.banner.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('deve lançar BadRequest quando findMany falhar', async () => {
      prisma.banner.findMany.mockRejectedValue(new Error('db'));

      await expect(repository.findAll({}, 'org-1')).rejects.toThrow(
        'Erro ao buscar banners',
      );

      expect(logger.error).toHaveBeenCalledWith(
        'BannerRepository.findAll falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findById', () => {
    it('deve retornar banner quando existir', async () => {
      const banner = makeBanner();
      prisma.banner.findFirst.mockResolvedValue(banner);

      await expect(
        repository.findById(banner.id, banner.organizationId),
      ).resolves.toEqual(banner);

      expect(prisma.banner.findFirst).toHaveBeenCalledWith({
        where: {
          id: banner.id,
          organizationId: banner.organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          link: true,
          order: true,
          isActive: true,
          initialDate: true,
          finishDate: true,
          mobileImageKey: true,
          desktopImageKey: true,
        },
      });
    });

    it('deve lançar BadRequest quando findFirst falhar', async () => {
      prisma.banner.findFirst.mockRejectedValue(new Error('db'));

      await expect(repository.findById('id', 'org')).rejects.toThrow(
        'Erro ao buscar banner',
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('deve persistir com URLs de imagem e defaults de link/datas', async () => {
      prisma.banner.create.mockResolvedValue({} as never);

      await repository.create(
        'org-1',
        {
          name: 'Banner mínimo',
          order: 0,
          mobileImageKey: '/m.png',
          desktopImageKey: '/d.png',
        },
        'user-1',
      );

      expect(prisma.banner.create).toHaveBeenCalledWith({
        data: {
          id: 'mocked-uuid',
          organizationId: 'org-1',
          name: 'Banner mínimo',
          link: null,
          order: 0,
          isActive: true,
          initialDate: null,
          finishDate: null,
          mobileImageKey: '/m.png',
          desktopImageKey: '/d.png',
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Banner criado',
        expect.objectContaining({
          organizationId: 'org-1',
          userId: 'user-1',
          name: 'Banner mínimo',
        }),
      );
    });

    it('deve lançar BadRequest quando create falhar', async () => {
      prisma.banner.create.mockRejectedValue(new Error('db'));
      const dto = makeCreateBannerDTO();

      await expect(
        repository.create(
          'org-1',
          {
            ...dto,
            mobileImageKey: '/m.png',
            desktopImageKey: '/d.png',
          },
          'user-1',
        ),
      ).rejects.toThrow('Erro ao criar banner');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('deve aplicar apenas campos enviados', async () => {
      prisma.banner.updateMany.mockResolvedValue({ count: 1 });

      await repository.update('bid', 'org-1', { name: 'Só nome' }, 'user-1');

      expect(prisma.banner.updateMany).toHaveBeenCalledWith({
        where: { id: 'bid', organizationId: 'org-1', isDeleted: false },
        data: { name: 'Só nome' },
      });
      expect(logger.info).toHaveBeenCalled();
    });

    it('deve incluir URLs opcionais quando informadas', async () => {
      prisma.banner.updateMany.mockResolvedValue({ count: 1 });

      await repository.update(
        'bid',
        'org-1',
        { mobileImageKey: '/new-m.png', order: 3 },
        'user-1',
      );

      expect(prisma.banner.updateMany).toHaveBeenCalledWith({
        where: { id: 'bid', organizationId: 'org-1', isDeleted: false },
        data: { order: 3, mobileImageKey: '/new-m.png' },
      });
    });

    it('deve atualizar todos os campos opcionais quando informados', async () => {
      prisma.banner.updateMany.mockResolvedValue({ count: 1 });
      const initialDate = new Date('2025-01-01');
      const finishDate = new Date('2025-12-31');

      await repository.update(
        'bid',
        'org-1',
        {
          name: 'N',
          link: 'https://x.com',
          order: 1,
          isActive: false,
          initialDate,
          finishDate,
          mobileImageKey: '/m.png',
          desktopImageKey: '/d.png',
        },
        'user-1',
      );

      expect(prisma.banner.updateMany).toHaveBeenCalledWith({
        where: { id: 'bid', organizationId: 'org-1', isDeleted: false },
        data: {
          name: 'N',
          link: 'https://x.com',
          order: 1,
          isActive: false,
          initialDate,
          finishDate,
          mobileImageKey: '/m.png',
          desktopImageKey: '/d.png',
        },
      });
    });

    it('deve lançar BadRequest quando updateMany falhar', async () => {
      prisma.banner.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.update('bid', 'org-1', { name: 'x' }, 'user-1'),
      ).rejects.toThrow('Erro ao atualizar banner');

      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    it('deve marcar isDeleted e deletedAt', async () => {
      prisma.banner.updateMany.mockResolvedValue({ count: 1 });

      await repository.softDelete('bid', 'org-1', 'user-1');

      expect(prisma.banner.updateMany).toHaveBeenCalledWith({
        where: { id: 'bid', organizationId: 'org-1', isDeleted: false },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
        },
      });
      expect(logger.info).toHaveBeenCalledWith(
        'Banner removido',
        expect.objectContaining({
          bannerId: 'bid',
          organizationId: 'org-1',
          userId: 'user-1',
        }),
      );
    });

    it('deve lançar BadRequest quando softDelete falhar', async () => {
      prisma.banner.updateMany.mockRejectedValue(new Error('db'));

      await expect(
        repository.softDelete('bid', 'org-1', 'user-1'),
      ).rejects.toThrow('Erro ao remover banner');

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
