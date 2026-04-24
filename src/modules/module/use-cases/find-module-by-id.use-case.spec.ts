import { NotFoundException } from '@common/filters';
import { ModuleRepository } from '../repository';
import { makeModule } from './test-helpers';
import { FindModuleByIdUseCase } from './find-module-by-id.use-case';

describe('FindModuleByIdUseCase', () => {
  let useCase: FindModuleByIdUseCase;
  let moduleRepository: jest.Mocked<Pick<ModuleRepository, 'findById'>>;

  beforeEach(() => {
    moduleRepository = {
      findById: jest.fn(),
    };

    useCase = new FindModuleByIdUseCase(
      moduleRepository as unknown as ModuleRepository,
    );
  });

  it('deve retornar módulo quando existir', async () => {
    const module = makeModule({ id: 'm1' });
    moduleRepository.findById.mockResolvedValue(module);

    await expect(useCase.execute('m1')).resolves.toEqual(module);
    expect(moduleRepository.findById).toHaveBeenCalledWith('m1');
  });

  it('deve lançar not found quando não existir', async () => {
    moduleRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(useCase.execute('missing')).rejects.toThrow(
      'Módulo não encontrado',
    );
  });
});
