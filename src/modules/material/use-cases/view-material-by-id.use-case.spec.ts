import { ForbiddenException, NotFoundException } from '@common/filters';
import { MaterialRepository } from '../repository';
import { FindMaterialByIdUseCase } from './find-material-by-id.use-case';
import { makeMaterialDetails } from './test-helpers';
import { ViewMaterialByIdUseCase } from './view-material-by-id.use-case';

describe('ViewMaterialByIdUseCase', () => {
  let findMaterialByIdUseCase: jest.Mocked<Pick<FindMaterialByIdUseCase, 'execute'>>;
  let materialRepository: jest.Mocked<
    Pick<MaterialRepository, 'userHasCategoryAccess' | 'registerView'>
  >;
  let useCase: ViewMaterialByIdUseCase;

  beforeEach(() => {
    findMaterialByIdUseCase = {
      execute: jest.fn(),
    };
    materialRepository = {
      userHasCategoryAccess: jest.fn(),
      registerView: jest.fn(),
    };

    useCase = new ViewMaterialByIdUseCase(
      findMaterialByIdUseCase as unknown as FindMaterialByIdUseCase,
      materialRepository as unknown as MaterialRepository,
    );
  });

  it('deve retornar o material e registrar visualização quando houver acesso', async () => {
    const material = makeMaterialDetails();

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(true);
    materialRepository.registerView.mockResolvedValue(undefined);

    await expect(
      useCase.execute(material.id, 'org-id', 'user-id'),
    ).resolves.toEqual(material);

    expect(findMaterialByIdUseCase.execute).toHaveBeenCalledWith(
      material.id,
      'org-id',
      'user-id',
    );
    expect(materialRepository.userHasCategoryAccess).toHaveBeenCalledWith(
      'org-id',
      material.categoryId,
      'user-id',
    );
    expect(materialRepository.registerView).toHaveBeenCalledWith(material.id);
  });

  it('deve propagar NotFoundException quando o material não existir', async () => {
    findMaterialByIdUseCase.execute.mockRejectedValue(
      new NotFoundException('Material não encontrado'),
    );

    const result = useCase.execute('missing', 'org-id', 'user-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    expect(materialRepository.userHasCategoryAccess).not.toHaveBeenCalled();
    expect(materialRepository.registerView).not.toHaveBeenCalled();
  });

  it('deve lançar ForbiddenException sem registrar visualização quando não houver acesso', async () => {
    const material = makeMaterialDetails();

    findMaterialByIdUseCase.execute.mockResolvedValue(material);
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);

    const result = useCase.execute(material.id, 'org-id', 'user-id');

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    await expect(result).rejects.toThrow('Você não possui acesso a este material');
    expect(materialRepository.registerView).not.toHaveBeenCalled();
  });
});
