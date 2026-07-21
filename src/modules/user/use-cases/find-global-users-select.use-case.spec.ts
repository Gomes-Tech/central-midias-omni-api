import { UserRepository } from '../repository';
import { FindGlobalUsersSelectUseCase } from './find-global-users-select.use-case';

describe('FindGlobalUsersSelectUseCase', () => {
  it('deve buscar somente usuários globais disponíveis na organização', async () => {
    const repository = {
      findGlobalUsersSelect: jest
        .fn()
        .mockResolvedValue([{ id: 'global-1', name: 'Global' }]),
    };
    const useCase = new FindGlobalUsersSelectUseCase(
      repository as unknown as UserRepository,
    );

    await expect(useCase.execute('org-1')).resolves.toEqual([
      { id: 'global-1', name: 'Global' },
    ]);
    expect(repository.findGlobalUsersSelect).toHaveBeenCalledWith('org-1');
  });
});
