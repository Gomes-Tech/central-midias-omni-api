import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { ModuleRepository } from '../repository';
import { FindModuleByIdUseCase } from './find-module-by-id.use-case';
import { makeModule } from './test-helpers';
import { DeleteModuleUseCase } from './delete-module.use-case';

function createPrismaMock() {
  return {
    rolePermission: {
      count: jest.fn(),
    },
  };
}

describe('DeleteModuleUseCase', () => {
  let moduleRepository: jest.Mocked<Pick<ModuleRepository, 'delete'>>;
  let findModuleByIdUseCase: jest.Mocked<Pick<FindModuleByIdUseCase, 'execute'>>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let useCase: DeleteModuleUseCase;

  beforeEach(() => {
    moduleRepository = { delete: jest.fn().mockResolvedValue(undefined) };
    findModuleByIdUseCase = { execute: jest.fn() };
    prisma = createPrismaMock();

    useCase = new DeleteModuleUseCase(
      moduleRepository as unknown as ModuleRepository,
      findModuleByIdUseCase as unknown as FindModuleByIdUseCase,
      prisma as unknown as PrismaService,
    );
  });

  it('deve remover módulo quando não houver permissões vinculadas', async () => {
    findModuleByIdUseCase.execute.mockResolvedValue(makeModule({ id: 'm1' }));
    prisma.rolePermission.count.mockResolvedValue(0);

    await expect(useCase.execute('m1')).resolves.toBeUndefined();
    expect(prisma.rolePermission.count).toHaveBeenCalledWith({
      where: { moduleId: 'm1' },
    });
    expect(moduleRepository.delete).toHaveBeenCalledWith('m1');
  });

  it('deve lançar BadRequest quando houver permissões vinculadas', async () => {
    findModuleByIdUseCase.execute.mockResolvedValue(makeModule({ id: 'm1' }));
    prisma.rolePermission.count.mockResolvedValue(2);

    await expect(useCase.execute('m1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(useCase.execute('m1')).rejects.toThrow(
      'Não é possível remover um módulo vinculado a permissões',
    );
    expect(moduleRepository.delete).not.toHaveBeenCalled();
  });
});
