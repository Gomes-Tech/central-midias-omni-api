import { PrismaService } from '@infrastructure/prisma';
import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { DeleteGlobalRoleUseCase } from './delete-global-role.use-case';
import { FindGlobalRoleByIdUseCase } from './find-global-role-by-id.use-case';

function createPrismaMock() {
  return {
    user: {
      count: jest.fn(),
    },
  };
}

describe('DeleteGlobalRoleUseCase', () => {
  let rolesRepository: jest.Mocked<
    Pick<RolesRepository, 'softDeleteGlobalRole'>
  >;
  let findGlobalRoleByIdUseCase: jest.Mocked<
    Pick<FindGlobalRoleByIdUseCase, 'execute'>
  >;
  let prisma: ReturnType<typeof createPrismaMock>;
  let useCase: DeleteGlobalRoleUseCase;

  beforeEach(() => {
    rolesRepository = {
      softDeleteGlobalRole: jest.fn().mockResolvedValue(undefined),
    };
    findGlobalRoleByIdUseCase = { execute: jest.fn() };
    prisma = createPrismaMock();

    useCase = new DeleteGlobalRoleUseCase(
      rolesRepository as unknown as RolesRepository,
      findGlobalRoleByIdUseCase as unknown as FindGlobalRoleByIdUseCase,
      prisma as unknown as PrismaService,
    );
  });

  function makeGlobalRole(overrides = {}) {
    return {
      ...makeRole({ canAccessBackoffice: true }),
      permissions: [],
      ...overrides,
    };
  }

  it('deve inativar perfil global quando não for sistema e não houver usuários', async () => {
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(
      makeGlobalRole({ id: 'r-global', isSystem: false }),
    );
    prisma.user.count.mockResolvedValue(0);

    await expect(useCase.execute('r-global')).resolves.toBeUndefined();

    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { globalRoleId: 'r-global' },
    });
    expect(rolesRepository.softDeleteGlobalRole).toHaveBeenCalledWith(
      'r-global',
    );
  });

  it('deve lançar BadRequest para perfil global sistema', async () => {
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(
      makeGlobalRole({ id: 'r-global', isSystem: true }),
    );

    await expect(useCase.execute('r-global')).rejects.toThrow(
      'Não é possível inativar um perfil global sistema',
    );

    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(rolesRepository.softDeleteGlobalRole).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando houver usuários globais vinculados', async () => {
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(
      makeGlobalRole({ id: 'r-global', isSystem: false }),
    );
    prisma.user.count.mockResolvedValue(1);

    await expect(useCase.execute('r-global')).rejects.toThrow(
      'Não é possível inativar um perfil global vinculado a usuários',
    );

    expect(rolesRepository.softDeleteGlobalRole).not.toHaveBeenCalled();
  });
});
