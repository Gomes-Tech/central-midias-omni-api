import { ModuleRepository } from '../repository';
import { makeModule } from './test-helpers';
import { FindAllModuleUseCase } from './find-all-module.use-case';

describe('FindAllModuleUseCase', () => {
  let useCase: FindAllModuleUseCase;
  let moduleRepository: jest.Mocked<Pick<ModuleRepository, 'findAll'>>;

  beforeEach(() => {
    moduleRepository = {
      findAll: jest.fn(),
    };

    useCase = new FindAllModuleUseCase(
      moduleRepository as unknown as ModuleRepository,
    );
  });

  it('deve retornar lista de módulos', async () => {
    const modules = [makeModule({ id: 'm1' }), makeModule({ id: 'm2' })];
    moduleRepository.findAll.mockResolvedValue(modules);

    await expect(useCase.execute()).resolves.toEqual(modules);
    expect(moduleRepository.findAll).toHaveBeenCalledWith();
  });
});
