import { BadRequestException } from '@common/filters';
import { RolesRepository } from '../repository';
import { makeRole, makeUpdateRoleDTO } from './test-helpers';
import { FindRoleByIdUseCase } from './find-role-by-id.use-case';
import { UpdateRoleUseCase } from './update-role.use-case';

describe('UpdateRoleUseCase', () => {
  let rolesRepository: jest.Mocked<Pick<RolesRepository, 'findByName' | 'update'>>;
  let findRoleByIdUseCase: jest.Mocked<Pick<FindRoleByIdUseCase, 'execute'>>;
  let useCase: UpdateRoleUseCase;

  beforeEach(() => {
    rolesRepository = {
      findByName: jest.fn(),
      update: jest.fn(),
    };
    findRoleByIdUseCase = { execute: jest.fn() };

    useCase = new UpdateRoleUseCase(
      rolesRepository as unknown as RolesRepository,
      findRoleByIdUseCase as unknown as FindRoleByIdUseCase,
    );
  });

  it('deve atualizar quando o nome não mudar', async () => {
    const role = makeRole({ id: 'r1', name: 'SAME' });
    const updated = makeRole({ id: 'r1', label: 'Novo' });
    findRoleByIdUseCase.execute.mockResolvedValue(role);
    rolesRepository.update.mockResolvedValue(updated);

    const data = makeUpdateRoleDTO({ label: 'Novo' });

    await expect(useCase.execute('r1', data)).resolves.toEqual(updated);

    expect(rolesRepository.findByName).not.toHaveBeenCalled();
    expect(rolesRepository.update).toHaveBeenCalledWith('r1', data);
  });

  it('deve atualizar quando o nome mudar para um disponível', async () => {
    const role = makeRole({ id: 'r1', name: 'OLD' });
    const updated = makeRole({ id: 'r1', name: 'NEW' });
    findRoleByIdUseCase.execute.mockResolvedValue(role);
    rolesRepository.findByName.mockResolvedValue(null);
    rolesRepository.update.mockResolvedValue(updated);

    const data = makeUpdateRoleDTO({ name: 'NEW' });

    await expect(useCase.execute('r1', data)).resolves.toEqual(updated);

    expect(rolesRepository.findByName).toHaveBeenCalledWith('NEW');
    expect(rolesRepository.update).toHaveBeenCalledWith('r1', data);
  });

  it('deve permitir manter o mesmo nome do próprio perfil', async () => {
    const role = makeRole({ id: 'r1', name: 'CODE' });
    const updated = makeRole({ id: 'r1', name: 'CODE', label: 'X' });
    findRoleByIdUseCase.execute.mockResolvedValue(role);
    rolesRepository.update.mockResolvedValue(updated);

    const data = makeUpdateRoleDTO({ name: 'CODE', label: 'X' });

    await expect(useCase.execute('r1', data)).resolves.toEqual(updated);

    expect(rolesRepository.findByName).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando outro perfil já usar o nome', async () => {
    const role = makeRole({ id: 'r1', name: 'OLD' });
    findRoleByIdUseCase.execute.mockResolvedValue(role);
    rolesRepository.findByName.mockResolvedValue(
      makeRole({ id: 'other', name: 'TAKEN' }),
    );

    const data = makeUpdateRoleDTO({ name: 'TAKEN' });

    await expect(useCase.execute('r1', data)).rejects.toThrow(
      'Já existe um perfil com este nome',
    );

    expect(rolesRepository.update).not.toHaveBeenCalled();
  });
});
