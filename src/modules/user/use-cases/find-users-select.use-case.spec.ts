import { UserRepository } from '../repository';
import { FindUsersSelectUseCase } from './find-users-select.use-case';

describe('FindUsersSelectUseCase', () => {
  it('deve buscar usuários disponíveis para a organização', async () => {
    const repository = {
      findUsersSelect: jest
        .fn()
        .mockResolvedValue([{ id: 'user-1', name: 'Usuário' }]),
    };
    const useCase = new FindUsersSelectUseCase(
      repository as unknown as UserRepository,
    );

    await expect(useCase.execute('org-1')).resolves.toEqual([
      { id: 'user-1', name: 'Usuário' },
    ]);
    expect(repository.findUsersSelect).toHaveBeenCalledWith('org-1');
  });
});
