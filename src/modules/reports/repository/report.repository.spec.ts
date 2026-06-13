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

  it('deve lançar BadRequestException quando query falhar', async () => {
    prisma.$queryRawUnsafe.mockRejectedValue(new Error('db down'));

    await expect(
      repository.findTopMaterialsByViews('org-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
