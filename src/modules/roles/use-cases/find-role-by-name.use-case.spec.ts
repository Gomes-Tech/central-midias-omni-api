import { NotFoundException } from '@common/filters';
import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { FindRoleByNameUseCase } from './find-role-by-name.use-case';

describe('FindRoleByNameUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findByName'>>;
  let useCase: FindRoleByNameUseCase;

  beforeEach(() => {
    repository = { findByName: jest.fn() };
    useCase = new FindRoleByNameUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar o perfil quando existir', async () => {
    const role = makeRole({ name: 'ADMIN' });
    repository.findByName.mockResolvedValue(role);

    await expect(useCase.execute('ADMIN')).resolves.toEqual(role);
    expect(repository.findByName).toHaveBeenCalledWith('ADMIN');
  });

  it('deve lançar NotFound quando não existir', async () => {
    repository.findByName.mockResolvedValue(null);

    await expect(useCase.execute('NONE')).rejects.toThrow(NotFoundException);
  });
});
