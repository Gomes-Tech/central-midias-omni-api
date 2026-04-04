import { NotFoundException } from '@common/filters';
import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';

describe('FindRoleByIdUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findById'>>;
  let useCase: FindRoleByIdUseCase;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
    };

    useCase = new FindRoleByIdUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar o perfil quando existir', async () => {
    const role = makeRole();
    repository.findById.mockResolvedValue(role);

    await expect(useCase.execute(role.id)).resolves.toEqual(role);
    expect(repository.findById).toHaveBeenCalledWith(role.id);
  });

  it('deve lançar NotFound quando não existir', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toThrow(NotFoundException);
  });
});
