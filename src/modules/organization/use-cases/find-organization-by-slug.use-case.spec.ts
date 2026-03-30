import { NotFoundException } from '@common/filters';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationBySlugUseCase } from './find-organization-by-slug.use-case';
import { makeOrganization } from './test-helpers';

describe('FindOrganizationBySlugUseCase', () => {
  let useCase: FindOrganizationBySlugUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;

  beforeEach(() => {
    organizationRepository = {
      findBySlug: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    useCase = new FindOrganizationBySlugUseCase(organizationRepository);
  });

  it('deve retornar organização por slug', async () => {
    const organization = makeOrganization();

    organizationRepository.findBySlug.mockResolvedValue(organization);

    await expect(useCase.execute(organization.slug)).resolves.toEqual(
      organization,
    );
  });

  it('deve chamar organizationRepository.findBySlug com o slug correto', async () => {
    const organization = makeOrganization();

    organizationRepository.findBySlug.mockResolvedValue(organization);

    await expect(useCase.execute(organization.slug)).resolves.toEqual(
      organization,
    );

    expect(organizationRepository.findBySlug).toHaveBeenCalledWith(
      organization.slug,
    );
  });

  it('deve lançar not found quando slug não existir', async () => {
    organizationRepository.findBySlug.mockResolvedValue(null);

    const result = useCase.execute('missing-slug');

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toThrow('Organização não encontrada');
  });

  it('deve propagar erro quando organizationRepository.findBySlug falhar', async () => {
    const error = new Error('Erro ao buscar organização por slug');

    organizationRepository.findBySlug.mockRejectedValue(error);

    await expect(useCase.execute('organization-slug')).rejects.toBe(error);
  });
});
