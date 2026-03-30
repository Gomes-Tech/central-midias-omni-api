import { OrganizationRepository } from '../repositories';
import { DeleteOrganizationUseCase } from './delete-organization.use-case';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';
import { makeOrganization } from './test-helpers';

describe('DeleteOrganizationUseCase', () => {
  let useCase: DeleteOrganizationUseCase;
  let organizationRepository: jest.Mocked<OrganizationRepository>;
  let findOrganizationByIdUseCase: jest.Mocked<FindOrganizationByIdUseCase>;

  beforeEach(() => {
    organizationRepository = {
      delete: jest.fn(),
    } as unknown as jest.Mocked<OrganizationRepository>;

    findOrganizationByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindOrganizationByIdUseCase>;

    useCase = new DeleteOrganizationUseCase(
      organizationRepository,
      findOrganizationByIdUseCase,
    );
  });

  it('deve validar a organização antes de excluir', async () => {
    findOrganizationByIdUseCase.execute.mockResolvedValue(makeOrganization());
    organizationRepository.delete.mockResolvedValue();

    await expect(useCase.execute('organization-id')).resolves.toBeUndefined();
    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.delete).toHaveBeenCalledWith(
      'organization-id',
    );
  });

  it('deve propagar erro quando findOrganizationByIdUseCase.execute falhar', async () => {
    const error = new Error('Erro ao validar organização');

    findOrganizationByIdUseCase.execute.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
    expect(organizationRepository.delete).not.toHaveBeenCalled();
  });

  it('deve propagar erro quando organizationRepository.delete falhar', async () => {
    const error = new Error('Erro ao excluir organização');

    findOrganizationByIdUseCase.execute.mockResolvedValue(makeOrganization());
    organizationRepository.delete.mockRejectedValue(error);

    await expect(useCase.execute('organization-id')).rejects.toBe(error);
    expect(findOrganizationByIdUseCase.execute).toHaveBeenCalledWith(
      'organization-id',
    );
    expect(organizationRepository.delete).toHaveBeenCalledWith(
      'organization-id',
    );
  });
});
