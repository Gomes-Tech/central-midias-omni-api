import { BadRequestException } from '@common/filters';
import { ModuleRepository } from '../repository';
import { makeCreateModuleDTO, makeModule } from './test-helpers';
import { CreateModuleUseCase } from './create-module.use-case';

describe('CreateModuleUseCase', () => {
  let useCase: CreateModuleUseCase;
  let moduleRepository: jest.Mocked<
    Pick<ModuleRepository, 'findByName' | 'create'>
  >;

  beforeEach(() => {
    moduleRepository = {
      findByName: jest.fn(),
      create: jest.fn(),
    };

    useCase = new CreateModuleUseCase(
      moduleRepository as unknown as ModuleRepository,
    );
  });

  it('deve criar módulo quando não existir duplicidade', async () => {
    const dto = makeCreateModuleDTO({ name: 'organizations' });
    const created = makeModule({ id: 'm1', name: 'organizations' });
    moduleRepository.findByName.mockResolvedValue(null);
    moduleRepository.create.mockResolvedValue(created);

    await expect(useCase.execute(dto)).resolves.toEqual(created);
    expect(moduleRepository.findByName).toHaveBeenCalledWith('organizations');
    expect(moduleRepository.create).toHaveBeenCalledWith(dto);
  });

  it('deve lançar BadRequest quando já existir módulo com mesmo nome', async () => {
    const dto = makeCreateModuleDTO({ name: 'roles' });
    moduleRepository.findByName.mockResolvedValue(makeModule({ name: 'roles' }));

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(useCase.execute(dto)).rejects.toThrow(
      'Já existe um módulo com este nome',
    );
    expect(moduleRepository.create).not.toHaveBeenCalled();
  });
});
