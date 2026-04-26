import { OrganizationRepository } from '../repositories';
import { FindAllOrganizationsUseCase } from './find-all-organization.use-case';
import { makeOrganization } from './test-helpers';

describe('FindAllOrganizationsUseCase', () => {
  let useCase: FindAllOrganizationsUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;

  beforeEach(() => {
    organizationRepository = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    useCase = new FindAllOrganizationsUseCase(organizationRepository);
  });

  it('deve retornar a lista do repositório', async () => {
    const response = {
      data: [
        makeOrganization(),
        makeOrganization({ id: 'organization-2', slug: 'organization-2' }),
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    };

    organizationRepository.findAll.mockResolvedValue(response);

    await expect(useCase.execute()).resolves.toEqual(response);
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
