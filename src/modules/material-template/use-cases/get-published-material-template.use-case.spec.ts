import { MaterialRepository } from '@modules/material/repository';
import { MaterialTemplateRepository } from '../repository';
import { MaterialTemplateResponseService } from '../services';
import { GetPublishedMaterialTemplateUseCase } from './get-published-material-template.use-case';

describe('GetPublishedMaterialTemplateUseCase', () => {
  let templateRepository: jest.Mocked<MaterialTemplateRepository>;
  let materialRepository: jest.Mocked<MaterialRepository>;
  let responseService: { resolve: jest.Mock };
  let useCase: GetPublishedMaterialTemplateUseCase;
  const template = {
    status: 'PUBLISHED',
    material: { isCustomizable: true, categoryId: 'category-id' },
  };

  beforeEach(() => {
    templateRepository = {
      findOrThrow: jest.fn().mockResolvedValue(template),
    } as unknown as jest.Mocked<MaterialTemplateRepository>;
    materialRepository = {
      userHasCategoryAccess: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<MaterialRepository>;
    responseService = {
      resolve: jest.fn().mockResolvedValue({
        status: 'PUBLISHED',
        legacyImport: { position: 'TOP' },
        missingAssetIds: [],
      }),
    };
    useCase = new GetPublishedMaterialTemplateUseCase(
      templateRepository,
      materialRepository,
      responseService as unknown as MaterialTemplateResponseService,
    );
  });

  it('retorna somente publicado, remove metadados legados e valida categoria', async () => {
    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).resolves.toEqual({
      status: 'PUBLISHED',
      legacyImport: null,
      missingAssetIds: [],
    });
    expect(materialRepository.userHasCategoryAccess).toHaveBeenCalledWith(
      'org-id',
      'category-id',
      'user-id',
    );
  });

  it('oculta templates em rascunho', async () => {
    templateRepository.findOrThrow.mockResolvedValue({
      ...template,
      status: 'DRAFT',
    } as never);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).rejects.toThrow('Template publicado não encontrado');
    expect(responseService.resolve).not.toHaveBeenCalled();
  });

  it('nega agente sem acesso à categoria', async () => {
    materialRepository.userHasCategoryAccess.mockResolvedValue(false);

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).rejects.toThrow('Você não possui acesso a este material');
  });

  it('não entrega um publicado que ficou com asset ausente', async () => {
    responseService.resolve.mockResolvedValue({
      missingAssetIds: ['asset-id'],
    });

    await expect(
      useCase.execute('material-id', 'org-id', 'user-id'),
    ).rejects.toThrow('Template publicado indisponível');
  });
});
