import { NotFoundException } from '@common/filters';
import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { FindGlobalRoleByIdUseCase } from './find-global-role-by-id.use-case';

describe('FindGlobalRoleByIdUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findGlobalRoleById'>>;
  let useCase: FindGlobalRoleByIdUseCase;

  beforeEach(() => {
    repository = {
      findGlobalRoleById: jest.fn(),
    };
    useCase = new FindGlobalRoleByIdUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar perfil global quando existir', async () => {
    const role = makeRole({ id: 'r-global', canAccessBackoffice: true });
    repository.findGlobalRoleById.mockResolvedValue(role as never);

    await expect(useCase.execute('r-global')).resolves.toEqual(role);

    expect(repository.findGlobalRoleById).toHaveBeenCalledWith('r-global');
  });

  it('deve lançar NotFound quando perfil global não existir', async () => {
    repository.findGlobalRoleById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
