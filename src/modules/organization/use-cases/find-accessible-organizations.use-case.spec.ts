import { StorageService } from '@infrastructure/providers';
import { OrganizationRepository } from '../repositories';
import { FindAccessibleOrganizationsUseCase } from './find-accessible-organizations.use-case';

describe('FindAccessibleOrganizationsUseCase', () => {
  let useCase: FindAccessibleOrganizationsUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let storageService: jest.Mocked<Pick<StorageService, 'getPublicUrl'>>;

  beforeEach(() => {
    organizationRepository = {
      findAccessibleSelectForUser: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    storageService = {
      getPublicUrl: jest.fn(),
    };

    useCase = new FindAccessibleOrganizationsUseCase(
      organizationRepository,
      storageService as unknown as StorageService,
    );
  });

  it('deve retornar organizações visíveis para o usuário', async () => {
    const organizations = [
      { id: 'organization-1', name: 'Organization 1', avatarKey: null },
      { id: 'organization-2', name: 'Organization 2', avatarKey: null },
    ];

    organizationRepository.findAccessibleSelectForUser.mockResolvedValue(
      organizations,
    );

    await expect(useCase.execute('user-1')).resolves.toEqual([
      {
        id: 'organization-1',
        name: 'Organization 1',
        avatarUrl: null,
      },
      {
        id: 'organization-2',
        name: 'Organization 2',
        avatarUrl: null,
      },
    ]);
    expect(organizationRepository.findAccessibleSelectForUser).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('deve propagar erro quando o repositório falhar', async () => {
    const error = new Error('Erro ao buscar organizações');

    organizationRepository.findAccessibleSelectForUser.mockRejectedValue(error);

    await expect(useCase.execute('user-1')).rejects.toBe(error);
  });
});
