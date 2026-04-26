import { NotFoundException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';
import { makeOrganization } from './test-helpers';

describe('FindOrganizationByIdUseCase', () => {
  let useCase: FindOrganizationByIdUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let storageService: jest.Mocked<StorageService>;

  beforeEach(() => {
    organizationRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;
    storageService = {
      getPublicUrl: jest.fn(),
    } as unknown as jest.Mocked<StorageService>;

    useCase = new FindOrganizationByIdUseCase(
      organizationRepository,
      storageService,
    );
  });

  it('deve retornar organização por id', async () => {
    const organization = makeOrganization({
      avatarKey: 'organizations/logo.png',
    });

    organizationRepository.findById.mockResolvedValue(organization);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/logo.png');

    const { avatarKey: _avatarKey, ...organizationWithoutAvatarKey } =
      organization;

    await expect(useCase.execute(organization.id)).resolves.toEqual({
      ...organizationWithoutAvatarKey,
      avatarUrl: 'https://cdn.test/logo.png',
    });
  });

  it('deve chamar organizationRepository.findById com o id correto', async () => {
    const organization = makeOrganization({ avatarKey: null });

    organizationRepository.findById.mockResolvedValue(organization);
    storageService.getPublicUrl.mockResolvedValue('https://cdn.test/logo.png');

    const { avatarKey: _avatarKey, ...organizationWithoutAvatarKey } =
      organization;

    await expect(useCase.execute(organization.id)).resolves.toEqual({
      ...organizationWithoutAvatarKey,
      avatarUrl: null,
    });

    expect(organizationRepository.findById).toHaveBeenCalledWith(
      organization.id,
    );
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });

  it('deve lançar not found quando organização não existir', async () => {
    organizationRepository.findById.mockResolvedValue(null);

    const result = useCase.execute('missing-id');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Organização não encontrada');
  });

  it('deve propagar erro quando organizationRepository.findById falhar', async () => {
    const error = new Error('Erro ao buscar organização por id');

    organizationRepository.findById.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
  });
});
