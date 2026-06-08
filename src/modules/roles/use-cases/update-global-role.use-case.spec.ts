import { RolesRepository } from '../repository';
import { makeRole, makeUpdateGlobalRoleDTO } from './test-helpers';
import { FindGlobalRoleByIdUseCase } from './find-global-role-by-id.use-case';
import { UpdateGlobalRoleUseCase } from './update-global-role.use-case';

describe('UpdateGlobalRoleUseCase', () => {
  let rolesRepository: jest.Mocked<
    Pick<RolesRepository, 'findByName' | 'updateGlobalRole'>
  >;
  let findGlobalRoleByIdUseCase: jest.Mocked<
    Pick<FindGlobalRoleByIdUseCase, 'execute'>
  >;
  let useCase: UpdateGlobalRoleUseCase;

  beforeEach(() => {
    rolesRepository = {
      findByName: jest.fn(),
      updateGlobalRole: jest.fn(),
    };
    findGlobalRoleByIdUseCase = { execute: jest.fn() };

    useCase = new UpdateGlobalRoleUseCase(
      rolesRepository as unknown as RolesRepository,
      findGlobalRoleByIdUseCase as unknown as FindGlobalRoleByIdUseCase,
    );
  });

  it('deve atualizar perfil global quando nome não mudar', async () => {
    const role = makeRole({
      id: 'r-global',
      name: 'GLOBAL',
      canAccessBackoffice: true,
    });
    const data = makeUpdateGlobalRoleDTO({
      label: 'Global atualizado',
      permissions: [{ moduleId: 'mod-1', action: 'READ' }],
    });
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(role as never);
    rolesRepository.updateGlobalRole.mockResolvedValue({
      ...role,
      label: data.label,
    } as never);

    await expect(useCase.execute('r-global', data)).resolves.toEqual(
      expect.objectContaining({ label: data.label }),
    );

    expect(rolesRepository.findByName).not.toHaveBeenCalled();
    expect(rolesRepository.updateGlobalRole).toHaveBeenCalledWith(
      'r-global',
      data,
    );
  });

  it('deve atualizar quando o nome mudar para um disponível', async () => {
    const role = makeRole({
      id: 'r-global',
      name: 'GLOBAL_OLD',
      canAccessBackoffice: true,
    });
    const data = makeUpdateGlobalRoleDTO({ name: 'GLOBAL_NEW' });
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(role as never);
    rolesRepository.findByName.mockResolvedValue(null);
    rolesRepository.updateGlobalRole.mockResolvedValue({
      ...role,
      name: data.name,
    } as never);

    await expect(useCase.execute('r-global', data)).resolves.toEqual(
      expect.objectContaining({ name: data.name }),
    );

    expect(rolesRepository.findByName).toHaveBeenCalledWith('GLOBAL_NEW');
  });

  it('deve lançar BadRequest quando outro perfil já usar o nome', async () => {
    const role = makeRole({
      id: 'r-global',
      name: 'GLOBAL_OLD',
      canAccessBackoffice: true,
    });
    const data = makeUpdateGlobalRoleDTO({ name: 'TAKEN' });
    findGlobalRoleByIdUseCase.execute.mockResolvedValue(role as never);
    rolesRepository.findByName.mockResolvedValue(
      makeRole({ id: 'other', name: 'TAKEN' }),
    );

    await expect(useCase.execute('r-global', data)).rejects.toThrow(
      'Já existe um perfil com este nome',
    );

    expect(rolesRepository.updateGlobalRole).not.toHaveBeenCalled();
  });
});
