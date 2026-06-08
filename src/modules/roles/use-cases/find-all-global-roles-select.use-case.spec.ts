import { RolesRepository } from '../repository';
import { FindAllGlobalRolesSelectUseCase } from './find-all-global-roles-select.use-case';

describe('FindAllGlobalRolesSelectUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findAllGlobalRolesSelect'>>;
  let useCase: FindAllGlobalRolesSelectUseCase;

  beforeEach(() => {
    repository = { findAllGlobalRolesSelect: jest.fn() };
    useCase = new FindAllGlobalRolesSelectUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar a lista simplificada de perfis globais do repositório', async () => {
    const list = [
      { id: 'role-1', label: 'ROLE_1' },
      { id: 'role-2', label: 'ROLE_2' },
    ];
    repository.findAllGlobalRolesSelect.mockResolvedValue(list);

    await expect(useCase.execute()).resolves.toEqual(list);
  });

  it('deve chamar repository.findAllGlobalRolesSelect exatamente 1 vez', async () => {
    repository.findAllGlobalRolesSelect.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);

    expect(repository.findAllGlobalRolesSelect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando repository.findAllGlobalRolesSelect falhar', async () => {
    const error = new Error('Erro ao buscar perfis globais');
    repository.findAllGlobalRolesSelect.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
