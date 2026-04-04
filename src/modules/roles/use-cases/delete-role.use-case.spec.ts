import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
import { RolesRepository } from '../repository';
import { makeRole } from './test-helpers';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';
import { DeleteRoleUseCase } from './delete-role.use-case';

function createPrismaMock() {
  return {
    member: {
      count: jest.fn(),
    },
  };
}

describe('DeleteRoleUseCase', () => {
  let rolesRepository: jest.Mocked<Pick<RolesRepository, 'softDelete'>>;
  let findRoleByIdUseCase: jest.Mocked<Pick<FindRoleByIdUseCase, 'execute'>>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let useCase: DeleteRoleUseCase;

  beforeEach(() => {
    rolesRepository = { softDelete: jest.fn().mockResolvedValue(undefined) };
    findRoleByIdUseCase = { execute: jest.fn() };
    prisma = createPrismaMock();

    useCase = new DeleteRoleUseCase(
      rolesRepository as unknown as RolesRepository,
      findRoleByIdUseCase as unknown as FindRoleByIdUseCase,
      prisma as unknown as PrismaService,
    );
  });

  it('deve inativar quando não for sistema e não houver membros', async () => {
    const role = makeRole({ id: 'r1', isSystem: false });
    findRoleByIdUseCase.execute.mockResolvedValue(role);
    prisma.member.count.mockResolvedValue(0);

    await expect(useCase.execute('r1')).resolves.toBeUndefined();

    expect(prisma.member.count).toHaveBeenCalledWith({
      where: { roleId: 'r1' },
    });
    expect(rolesRepository.softDelete).toHaveBeenCalledWith('r1');
  });

  it('deve lançar BadRequest para perfil sistema', async () => {
    findRoleByIdUseCase.execute.mockResolvedValue(
      makeRole({ id: 'r1', isSystem: true }),
    );

    await expect(useCase.execute('r1')).rejects.toThrow(
      'Não é possível inativar um perfil sistema',
    );

    expect(prisma.member.count).not.toHaveBeenCalled();
    expect(rolesRepository.softDelete).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando houver usuários vinculados', async () => {
    findRoleByIdUseCase.execute.mockResolvedValue(
      makeRole({ id: 'r1', isSystem: false }),
    );
    prisma.member.count.mockResolvedValue(2);

    await expect(useCase.execute('r1')).rejects.toThrow(
      'Não é possível inativar um perfil vinculado a usuários',
    );

    expect(rolesRepository.softDelete).not.toHaveBeenCalled();
  });
});
