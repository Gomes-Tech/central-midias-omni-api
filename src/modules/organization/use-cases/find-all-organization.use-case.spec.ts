import { StorageService } from '@infrastructure/providers';
import { OrganizationRepository } from '../repositories';
import { FindAllOrganizationsUseCase } from './find-all-organization.use-case';
import { makeOrganization } from './test-helpers';

describe('FindAllOrganizationsUseCase', () => {
  let useCase: FindAllOrganizationsUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;

  beforeEach(() => {
    organizationRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindAllOrganizationsUseCase(
      organizationRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar a lista do repositório com avatarUrl', async () => {
    const a = makeOrganization();
    const b = makeOrganization({
      id: 'organization-2',
      slug: 'organization-2',
    });

    const response = {
      data: [a, b],
      total: 2,
      page: 1,
      totalPages: 1,
    };

    organizationRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute()).resolves.toEqual({
      data: [
        {
          id: a.id,
          name: a.name,
          slug: a.slug,
          isActive: a.isActive,
          createdAt: a.createdAt,
          avatarUrl: null,
        },
        {
          id: b.id,
          name: b.name,
          slug: b.slug,
          isActive: b.isActive,
          createdAt: b.createdAt,
          avatarUrl: null,
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });

    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve chamar organizationRepository.findAll exatamente 1 vez', async () => {
    organizationRepository.findAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    await expect(useCase.execute()).resolves.toEqual({
      data: [],
      total: 0,
      page: 1,
      totalPages: 0,
    });

    expect(organizationRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando organizationRepository.findAll falhar', async () => {
    const error = new Error('Erro ao buscar organizações');

    organizationRepository.findAll.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
