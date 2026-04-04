import { BadRequestException } from '@common/filters';
import { RolesRepository } from '../repository';
import { makeCreateGlobalRoleDTO } from './test-helpers';
import { CreateGlobalRoleUseCase } from './create-global-role.use-case';

describe('CreateGlobalRoleUseCase', () => {
  let repository: jest.Mocked<
    Pick<RolesRepository, 'findByName' | 'createGlobalRole'>
  >;
  let useCase: CreateGlobalRoleUseCase;

  beforeEach(() => {
    repository = {
      findByName: jest.fn(),
      createGlobalRole: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new CreateGlobalRoleUseCase(
      repository as unknown as RolesRepository,
    );
  });

  it('deve criar quando o nome estiver livre', async () => {
    const dto = makeCreateGlobalRoleDTO();
    repository.findByName.mockResolvedValue(null);

    await expect(useCase.execute(dto)).resolves.toBeUndefined();

    expect(repository.findByName).toHaveBeenCalledWith(dto.name);
    expect(repository.createGlobalRole).toHaveBeenCalledWith(dto);
  });

  it('deve lançar BadRequest quando o nome já existir', async () => {
    const dto = makeCreateGlobalRoleDTO({ name: 'DUP' });
    repository.findByName.mockResolvedValue({
      id: 'other',
      name: 'DUP',
    } as never);

    await expect(useCase.execute(dto)).rejects.toThrow(
      'Já existe um perfil com este nome',
    );

    expect(repository.createGlobalRole).not.toHaveBeenCalled();
  });
});
