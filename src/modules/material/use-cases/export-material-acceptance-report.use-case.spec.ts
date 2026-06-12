import { BadRequestException, NotFoundException } from '@common/filters';
import { MaterialRepository } from '../repository';
import { ExportMaterialAcceptanceReportUseCase } from './export-material-acceptance-report.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('ExportMaterialAcceptanceReportUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let useCase: ExportMaterialAcceptanceReportUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
      findAcceptanceReportRows: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    useCase = new ExportMaterialAcceptanceReportUseCase(materialRepository);
  });

  it('deve gerar csv com dados do relatório', async () => {
    const material = makeMaterialDetails({
      requiresAcceptance: true,
      name: 'Manual Interno',
    });
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.findAcceptanceReportRows.mockResolvedValue([
      {
        name: 'João',
        email: 'joao@teste.com',
        viewed: true,
        acceptedAt: new Date('2024-02-01T10:00:00.000Z'),
      },
      {
        name: 'Maria',
        email: 'maria@teste.com',
        viewed: false,
        acceptedAt: null,
      },
    ]);

    const result = await useCase.execute(material.id, 'org-id');

    expect(result.filename).toBe('material-aceite-manual-interno.csv');
    expect(result.content).toContain('nome,email,visualizou,data_aceite');
    expect(result.content).toContain('João,joao@teste.com,Sim,2024-02-01T10:00:00.000Z');
    expect(result.content).toContain('Maria,maria@teste.com,Nao,');
  });

  it('deve rejeitar exportação quando material não exigir aceite', async () => {
    materialRepository.findById.mockResolvedValue(makeMaterialDetails());

    await expect(useCase.execute('material-id', 'org-id')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve lançar NotFoundException quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'org-id')).rejects.toThrow(
      NotFoundException,
    );
  });
});
