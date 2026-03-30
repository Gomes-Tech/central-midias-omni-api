import { NotFoundException } from '@common/filters';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';
import { makeOrganization } from './test-helpers';

describe('FindOrganizationByIdUseCase', () => {
  let useCase: FindOrganizationByIdUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;

  beforeEach(() => {
    organizationRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    useCase = new FindOrganizationByIdUseCase(organizationRepository);
  });

  it('deve retornar organização por id', async () => {
    const organization = makeOrganization();

    organizationRepository.findById.mockResolvedValue(organization);

    await expect(useCase.execute(organization.id)).resolves.toEqual(
      organization,
    );
  });

  it('deve chamar organizationRepository.findById com o id correto', async () => {
    const organization = makeOrganization();

    organizationRepository.findById.mockResolvedValue(organization);

    await expect(useCase.execute(organization.id)).resolves.toEqual(
      organization,
    );

    expect(organizationRepository.findById).toHaveBeenCalledWith(
      organization.id,
    );
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
