import { NotFoundException } from '@common/filters';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('FindMaterialByIdUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let useCase: FindMaterialByIdUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    useCase = new FindMaterialByIdUseCase(materialRepository);
  });

  it('deve retornar o material quando existir', async () => {
    const material = makeMaterialDetails();

    materialRepository.findById.mockResolvedValue(material);

    await expect(useCase.execute(material.id, 'org-id')).resolves.toEqual(
      material,
    );
    expect(materialRepository.findById).toHaveBeenCalledWith(
      material.id,
      'org-id',
      undefined,
    );
  });

  it('deve repassar userId para consultar aceite do usuário', async () => {
    const material = makeMaterialDetails({
      currentUserAcceptedAt: new Date('2024-02-01T00:00:00.000Z'),
    });

    materialRepository.findById.mockResolvedValue(material);

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id'),
    ).resolves.toEqual(material);
    expect(materialRepository.findById).toHaveBeenCalledWith(
      material.id,
      'org-id',
      'user-id',
    );
  });

  it('deve lançar NotFoundException quando não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing', 'org-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Material não encontrado');
  });
});
