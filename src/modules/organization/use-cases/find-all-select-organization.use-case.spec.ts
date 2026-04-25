import { OrganizationRepository } from '../repositories';
import { FindAllSelectOrganizationsUseCase } from './find-all-select-organization.use-case';

describe('FindAllSelectOrganizationsUseCase', () => {
  let useCase: FindAllSelectOrganizationsUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;

  beforeEach(() => {
    organizationRepository = {
      findAllSelect: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    useCase = new FindAllSelectOrganizationsUseCase(organizationRepository);
  });

  it('deve retornar a lista simplificada do repositório', async () => {
    const organizations = [
      { id: 'organization-1', name: 'Organization 1' },
      { id: 'organization-2', name: 'Organization 2' },
    ];

    organizationRepository.findAllSelect.mockResolvedValue(organizations);

    await expect(useCase.execute()).resolves.toEqual(organizations);
  });

  it('deve chamar organizationRepository.findAllSelect exatamente 1 vez', async () => {
    organizationRepository.findAllSelect.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);

    expect(organizationRepository.findAllSelect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando organizationRepository.findAllSelect falhar', async () => {
    const error = new Error('Erro ao buscar organizações');

    organizationRepository.findAllSelect.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
