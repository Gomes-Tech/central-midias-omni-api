import { NotFoundException } from '@common/filters';
import { CategoryRoleAccessRepository } from '../repository';
import { DeleteCategoryRoleAccessUseCase } from './delete-category-role-access.use-case';

describe('DeleteCategoryRoleAccessUseCase', () => {
  let repository: jest.Mocked<
    Pick<
      CategoryRoleAccessRepository,
      'findByIdAndOrganization' | 'deleteById'
    >
  >;
  let useCase: DeleteCategoryRoleAccessUseCase;

  beforeEach(() => {
    repository = {
      findByIdAndOrganization: jest.fn(),
      deleteById: jest.fn(),
    };

    useCase = new DeleteCategoryRoleAccessUseCase(
      repository as unknown as CategoryRoleAccessRepository,
    );
  });

  it('deve excluir quando o vínculo existir na organização', async () => {
    repository.findByIdAndOrganization.mockResolvedValue({ id: 'cra-1' } as never);
    repository.deleteById.mockResolvedValue(undefined);

    await expect(
      useCase.execute('cra-1', 'org-1'),
    ).resolves.toBeUndefined();

    expect(repository.findByIdAndOrganization).toHaveBeenCalledWith(
      'cra-1',
      'org-1',
    );
    expect(repository.deleteById).toHaveBeenCalledWith('cra-1');
  });

  it('deve lançar NotFound quando o vínculo não existir', async () => {
    repository.findByIdAndOrganization.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(repository.deleteById).not.toHaveBeenCalled();
  });
});
