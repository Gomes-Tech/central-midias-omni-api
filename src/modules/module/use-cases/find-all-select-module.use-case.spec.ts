import { ModuleRepository } from '../repository';
import { FindAllSelectModuleUseCase } from './find-all-select-module.use-case';

describe('FindAllSelectModuleUseCase', () => {
  let useCase: FindAllSelectModuleUseCase;
  let moduleRepository: jest.Mocked<Pick<ModuleRepository, 'findAllSelect'>>;

  beforeEach(() => {
    moduleRepository = {
      findAllSelect: jest.fn(),
    };

    useCase = new FindAllSelectModuleUseCase(
      moduleRepository as unknown as ModuleRepository,
    );
  });

  it('deve retornar lista simplificada de módulos', async () => {
    const modules = [
      { id: 'm1', name: 'roles' },
      { id: 'm2', name: 'users' },
    ];
    moduleRepository.findAllSelect.mockResolvedValue(modules);

    await expect(useCase.execute()).resolves.toEqual(modules);
  });

  it('deve chamar moduleRepository.findAllSelect exatamente 1 vez', async () => {
    moduleRepository.findAllSelect.mockResolvedValue([]);

    await expect(useCase.execute()).resolves.toEqual([]);

    expect(moduleRepository.findAllSelect).toHaveBeenCalledTimes(1);
  });

  it('deve propagar erro quando moduleRepository.findAllSelect falhar', async () => {
    const error = new Error('Erro ao buscar módulos');
    moduleRepository.findAllSelect.mockRejectedValue(error);

    await expect(useCase.execute()).rejects.toBe(error);
  });
});
