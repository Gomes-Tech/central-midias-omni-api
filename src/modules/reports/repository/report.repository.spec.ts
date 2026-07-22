import { BadRequestException } from '@common/filters';
import { ReportRepository } from './report.repository';

describe('ReportRepository', () => {
  let prisma: {
    $queryRawUnsafe: jest.Mock;
  };
  let logger: { error: jest.Mock };
  let repository: ReportRepository;

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };
    logger = { error: jest.fn() };

    repository = new ReportRepository(prisma as never, logger as never);
  });

  describe('findTopUsersByPlatformLogins', () => {
    it('deve retornar usuários por login paginados', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            user_id: 'user-1',
            name: 'Ana',
            email: 'ana@test.com',
            login_count: BigInt(4),
            last_login_at: new Date('2026-06-01T10:00:00.000Z'),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findTopUsersByPlatformLogins('org-1', {
        page: 1,
        limit: 25,
      });

      expect(result).toEqual({
        data: [
          {
            userId: 'user-1',
            name: 'Ana',
            email: 'ana@test.com',
            loginCount: 4,
            lastLoginAt: new Date('2026-06-01T10:00:00.000Z'),
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
      });
    });

    it('deve usar página e limite padrão quando filtros não forem informados', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      const result = await repository.findTopUsersByPlatformLogins('org-1');

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('FROM user_platform_login_events'),
        'org-1',
        25,
        0,
      );
    });

    it('deve considerar total zero quando a query de contagem não retornar linhas', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findTopUsersByPlatformLogins('org-1');

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
    });

    it('deve lançar BadRequestException quando query falhar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

      await expect(
        repository.findTopUsersByPlatformLogins('org-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(logger.error).toHaveBeenCalledWith(
        'ReportRepository.findTopUsersByPlatformLogins falhou',
        expect.objectContaining({ organizationId: 'org-1' }),
      );
    });
  });

  describe('findAllTopUsersByPlatformLogins', () => {
    it('deve buscar todos os registros sem paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            user_id: 'user-1',
            name: 'Ana',
            email: 'ana@test.com',
            login_count: BigInt(4),
            last_login_at: null,
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findAllTopUsersByPlatformLogins('org-1');

      expect(result).toEqual([
        {
          userId: 'user-1',
          name: 'Ana',
          email: 'ana@test.com',
          loginCount: 4,
          lastLoginAt: null,
        },
      ]);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        Number.MAX_SAFE_INTEGER,
        0,
      );
    });
  });

  describe('findTopUsersByMaterialDownloads', () => {
    it('deve retornar usuários por download paginados', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            user_id: 'user-1',
            name: 'Ana',
            email: 'ana@test.com',
            download_count: BigInt(3),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findTopUsersByMaterialDownloads(
        'org-1',
        { page: 1, limit: 25 },
      );

      expect(result).toEqual({
        data: [
          {
            userId: 'user-1',
            name: 'Ana',
            email: 'ana@test.com',
            downloadCount: 3,
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
      });
    });

    it('deve considerar total zero quando a query de contagem não retornar linhas', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findTopUsersByMaterialDownloads(
        'org-1',
      );

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
    });

    it('deve lançar BadRequestException quando query falhar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

      await expect(
        repository.findTopUsersByMaterialDownloads('org-1'),
      ).rejects.toThrow('Erro ao buscar relatório de usuários por download');
    });
  });

  describe('findAllTopUsersByMaterialDownloads', () => {
    it('deve buscar todos os registros sem paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await expect(
        repository.findAllTopUsersByMaterialDownloads('org-1'),
      ).resolves.toEqual([]);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        Number.MAX_SAFE_INTEGER,
        0,
      );
    });
  });

  describe('findTopMaterialsByViews', () => {
    it('deve retornar materiais por visualização paginados', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            material_id: 'mat-1',
            name: 'Banner',
            category_name: 'Institucional',
            view_count: BigInt(10),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findTopMaterialsByViews('org-1', {
        page: 1,
        limit: 25,
      });

      expect(result).toEqual({
        data: [
          {
            materialId: 'mat-1',
            name: 'Banner',
            categoryName: 'Institucional',
            viewCount: 10,
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
      });
    });

    it('deve considerar total zero quando a query de contagem não retornar linhas', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findTopMaterialsByViews('org-1');

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
    });

    it('deve lançar BadRequestException quando query falhar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

      await expect(
        repository.findTopMaterialsByViews('org-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAllTopMaterialsByViews', () => {
    it('deve buscar todos os registros sem paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(0) }]);

      await expect(
        repository.findAllTopMaterialsByViews('org-1'),
      ).resolves.toEqual([]);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        Number.MAX_SAFE_INTEGER,
        0,
      );
    });
  });

  describe('findTopMaterialsByDownloads', () => {
    it('deve retornar materiais por download paginados', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            material_id: 'mat-1',
            name: 'Manual',
            category_name: 'Treinamento',
            download_count: BigInt(8),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findTopMaterialsByDownloads('org-1');

      expect(result.data[0]).toEqual({
        materialId: 'mat-1',
        name: 'Manual',
        categoryName: 'Treinamento',
        downloadCount: 8,
      });
    });

    it('deve retornar totalPages zero quando não houver registros', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findTopMaterialsByDownloads('org-1');

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
    });

    it('deve lançar BadRequestException quando query falhar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

      await expect(
        repository.findTopMaterialsByDownloads('org-1'),
      ).rejects.toThrow('Erro ao buscar relatório de materiais por download');
    });
  });

  describe('findAllTopMaterialsByDownloads', () => {
    it('deve buscar todos os registros sem paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            material_id: 'mat-1',
            name: 'Manual',
            category_name: 'Treinamento',
            download_count: BigInt(8),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      await expect(
        repository.findAllTopMaterialsByDownloads('org-1'),
      ).resolves.toEqual([
        {
          materialId: 'mat-1',
          name: 'Manual',
          categoryName: 'Treinamento',
          downloadCount: 8,
        },
      ]);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        Number.MAX_SAFE_INTEGER,
        0,
      );
    });
  });

  describe('findTopSearches', () => {
    it('deve retornar buscas agregadas paginadas', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            term: 'bola',
            search: 'bola',
            tag: 'bola',
            quantity: BigInt(51),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      const result = await repository.findTopSearches('org-1');

      expect(result).toEqual({
        data: [
          {
            term: 'bola',
            search: 'bola',
            tag: 'bola',
            quantity: 51,
          },
        ],
        total: 1,
        totalPages: 1,
        page: 1,
      });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '30 days'"),
        'org-1',
        25,
        0,
      );
      expect(prisma.$queryRawUnsafe.mock.calls[0][0]).toContain(
        'GROUP BY ts.term, ts.search, t.name',
      );
      expect(prisma.$queryRawUnsafe.mock.calls[0][0]).toContain(
        'FROM tag_searches ts',
      );
    });

    it('deve aplicar offset de paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ total: BigInt(30) }]);

      const result = await repository.findTopSearches('org-1', {
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({
        data: [],
        total: 30,
        totalPages: 3,
        page: 2,
      });
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        10,
        10,
      );
    });

    it('deve retornar totalPages zero quando não houver registros', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await repository.findTopSearches('org-1');

      expect(result).toEqual({ data: [], total: 0, totalPages: 0, page: 1 });
    });

    it('deve lançar BadRequestException quando query falhar', async () => {
      prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

      await expect(repository.findTopSearches('org-1')).rejects.toThrow(
        'Erro ao buscar relatório de termos de busca',
      );
    });
  });

  describe('findAllTopSearches', () => {
    it('deve buscar todos os registros sem paginação', async () => {
      prisma.$queryRawUnsafe
        .mockResolvedValueOnce([
          {
            term: 'bola',
            search: 'bola',
            tag: 'bola',
            quantity: BigInt(51),
          },
        ])
        .mockResolvedValueOnce([{ total: BigInt(1) }]);

      await expect(repository.findAllTopSearches('org-1')).resolves.toEqual([
        {
          term: 'bola',
          search: 'bola',
          tag: 'bola',
          quantity: 51,
        },
      ]);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(
        expect.any(String),
        'org-1',
        Number.MAX_SAFE_INTEGER,
        0,
      );
    });
  });
});
