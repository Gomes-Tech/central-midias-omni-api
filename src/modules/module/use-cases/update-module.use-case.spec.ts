import { BadRequestException } from '@common/filters';
import { ModuleRepository } from '../repository';
import {
  makeModule,
  makeUpdateModuleDTO,
} from './test-helpers';
import { FindModuleByIdUseCase } from './find-module-by-id.use-case';
import { UpdateModuleUseCase } from './update-module.use-case';

describe('UpdateModuleUseCase', () => {
  let useCase: UpdateModuleUseCase;
  let moduleRepository: jest.Mocked<
    Pick<ModuleRepository, 'findByName' | 'update'>
  >;
  let findModuleByIdUseCase: jest.Mocked<
    Pick<FindModuleByIdUseCase, 'execute'>
  >;

  beforeEach(() => {
    moduleRepository = {
      findByName: jest.fn(),
      update: jest.fn(),
    };
    findModuleByIdUseCase = {
      execute: jest.fn(),
    };

    useCase = new UpdateModuleUseCase(
      moduleRepository as unknown as ModuleRepository,
      findModuleByIdUseCase as unknown as FindModuleByIdUseCase,
    );
  });

  it('deve atualizar módulo quando nome não conflitar', async () => {
    const dto = makeUpdateModuleDTO({ name: 'users', label: 'Usuários' });
    const existing = makeModule({ id: 'm1', name: 'roles' });
    const updated = makeModule({ id: 'm1', name: 'users', label: 'Usuários' });
    findModuleByIdUseCase.execute.mockResolvedValue(existing);
    moduleRepository.findByName.mockResolvedValue(null);
    moduleRepository.update.mockResolvedValue(updated);

    await expect(useCase.execute('m1', dto)).resolves.toEqual(updated);
    expect(findModuleByIdUseCase.execute).toHaveBeenCalledWith('m1');
    expect(moduleRepository.findByName).toHaveBeenCalledWith('users');
    expect(moduleRepository.update).toHaveBeenCalledWith('m1', dto);
  });

  it('deve lançar BadRequest quando nome já estiver em outro módulo', async () => {
    const dto = makeUpdateModuleDTO({ name: 'members' });
    findModuleByIdUseCase.execute.mockResolvedValue(makeModule({ id: 'm1' }));
    moduleRepository.findByName.mockResolvedValue(makeModule({ id: 'm2' }));

    await expect(useCase.execute('m1', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(useCase.execute('m1', dto)).rejects.toThrow(
      'Já existe um módulo com este nome',
    );
    expect(moduleRepository.update).not.toHaveBeenCalled();
  });
});
