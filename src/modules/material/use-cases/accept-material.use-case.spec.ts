import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@common/filters';
import { MaterialRepository } from '../repository';
import { AcceptMaterialUseCase } from './accept-material.use-case';
import { makeMaterialDetails } from './test-helpers';

describe('AcceptMaterialUseCase', () => {
  let materialRepository: jest.Mocked<MaterialRepository>;
  let useCase: AcceptMaterialUseCase;

  beforeEach(() => {
    materialRepository = {
      findById: jest.fn(),
      userHasCategoryAccess: jest.fn(),
      upsertAcceptance: jest.fn(),
    } as unknown as jest.Mocked<MaterialRepository>;

    useCase = new AcceptMaterialUseCase(materialRepository);
  });

  it('deve registrar aceite quando material exigir confirmação', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: true });
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    materialRepository.upsertAcceptance.mockResolvedValue(undefined);

    const result = await useCase.execute(
      material.id,
      'org-id',
      'user-id',
      { accepted: true },
    );

    expect(result.acceptedAt).toBeInstanceOf(Date);
    expect(materialRepository.upsertAcceptance).toHaveBeenCalledWith(
      material.id,
      'user-id',
      expect.any(Date),
    );
  });

  it('deve rejeitar confirmação quando accepted for false', async () => {
    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { accepted: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve rejeitar quando material não exigir aceite', async () => {
    materialRepository.findById.mockResolvedValue(makeMaterialDetails());

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id', { accepted: true }),
    ).rejects.toThrow('Este material não exige confirmação de leitura');
  });

  it('deve rejeitar quando usuário não tiver acesso', async () => {
    const material = makeMaterialDetails({ requiresAcceptance: true });
    materialRepository.findById.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id', { accepted: true }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve lançar NotFoundException quando material não existir', async () => {
    materialRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', 'org-id', 'user-id', { accepted: true }),
    ).rejects.toThrow(NotFoundException);
  });
});
