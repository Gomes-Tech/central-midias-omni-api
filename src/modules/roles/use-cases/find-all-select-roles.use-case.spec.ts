import { RolesRepository } from '../repository';
import { FindAllSelectRolesUseCase } from './find-all-select-roles.use-case';

describe('FindAllSelectRolesUseCase', () => {
  let repository: jest.Mocked<Pick<RolesRepository, 'findAllSelect'>>;
  let useCase: FindAllSelectRolesUseCase;

  beforeEach(() => {
    repository = { findAllSelect: jest.fn() };
    useCase = new FindAllSelectRolesUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve retornar a lista simplificada do repositório', async () => {
    const list = [
      { id: 'role-1', name: 'ROLE_1' },
      { id: 'role-2', name: 'ROLE_2' },
    ];
    repository.findAllSelect.mockResolvedValue(list);

    await expect(useCase.execute()).resolves.toEqual(list);
  });

  it('deve chamar repository.findAllSelect exatamente 1 vez', async () => {
    repository.findAllSelect.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);

    expect(repository.findAllSelect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando repository.findAllSelect falhar', async () => {
    const error = new Error('Erro ao buscar perfis');
    repository.findAllSelect.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
