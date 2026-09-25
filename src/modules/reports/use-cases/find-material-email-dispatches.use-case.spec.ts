import { ReportRepository } from '../repository';
import { FindMaterialEmailDispatchesUseCase } from './find-material-email-dispatches.use-case';

describe('FindMaterialEmailDispatchesUseCase', () => {
  let reportRepository: jest.Mocked<
    Pick<ReportRepository, 'findMaterialEmailDispatches'>
  >;
  let useCase: FindMaterialEmailDispatchesUseCase;

  beforeEach(() => {
    reportRepository = {
      findMaterialEmailDispatches: jest.fn(),
    };

    useCase = new FindMaterialEmailDispatchesUseCase(
      reportRepository as unknown as ReportRepository,
    );
  });

  it('deve delegar a busca para o repositório com os filtros informados', async () => {
    const paginated = {
      data: [
        {
          id: 'dispatch-1',
          materialId: 'material-1',
          materialName: 'Campanha ABCDEF',
          subject: 'Novo material: Campanha ABCDEF',
          content: 'Conteúdo',
          recipientEmails: 'ana@test.com; bruno@test.com',
          recipientCount: 2,
          sentAt: new Date('2026-09-19T12:00:00.000Z'),
        },
      ],
      total: 1,
      totalPages: 1,
      page: 2,
    };
    reportRepository.findMaterialEmailDispatches.mockResolvedValue(paginated);

    await expect(
      useCase.execute('org-1', { page: 2, limit: 10 }),
    ).resolves.toEqual(paginated);

    expect(reportRepository.findMaterialEmailDispatches).toHaveBeenCalledWith(
      'org-1',
      {
        page: 2,
        limit: 10,
      },
    );
  });

  it('deve usar filtros vazios quando não informados', async () => {
    const paginated = { data: [], total: 0, totalPages: 0, page: 1 };
    reportRepository.findMaterialEmailDispatches.mockResolvedValue(paginated);

    await expect(useCase.execute('org-1')).resolves.toEqual(paginated);

    expect(reportRepository.findMaterialEmailDispatches).toHaveBeenCalledWith(
      'org-1',
      {},
    );
  });
});
