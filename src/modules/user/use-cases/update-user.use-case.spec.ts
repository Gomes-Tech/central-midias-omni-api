import { BadRequestException, ForbiddenException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { UserRepository } from '../repository';
import { UpdateUserUseCase } from './update-user.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { FindUserByTaxIdentifierUseCase } from './find-user-by-tax-identifier.use-case';
import { FindUserRoleUseCase } from './find-user-role.use-case';
import { makeUpdateUserDTO, makeUser } from './test-helpers';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let findUserByTaxIdentifierUseCase: jest.Mocked<FindUserByTaxIdentifierUseCase>;
  let findUserRoleUseCase: jest.Mocked<FindUserRoleUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;

  beforeEach(() => {
    userRepository = {
      update: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    findUserByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    findUserByTaxIdentifierUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByTaxIdentifierUseCase>;

    findUserRoleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserRoleUseCase>;

    cryptographyService = {
      compare: jest.fn(),
      hash: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    useCase = new UpdateUserUseCase(
      userRepository,
      findUserByIdUseCase,
      findUserByEmailUseCase,
      findUserByTaxIdentifierUseCase,
      findUserRoleUseCase,
      cryptographyService,
    );
  });

  it('deve impedir que usuário não admin atualize outro usuário', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserRoleUseCase.execute.mockResolvedValue('COLLABORATOR');

    await expect(
      useCase.execute('target-id', makeUpdateUserDTO(), 'requester-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userRepository.update).not.toHaveBeenCalled();
  });

  it('deve impedir atualização com email duplicado', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    findUserByEmailUseCase.execute.mockResolvedValue(
      makeUser({ id: 'another-user', email: 'jane@doe.com' }),
    );

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({ email: 'jane@doe.com', password: undefined }),
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve impedir atualização com cpf/cnpj duplicado', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    findUserByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    findUserByTaxIdentifierUseCase.execute.mockResolvedValue(
      makeUser({ id: 'another-user', taxIdentifier: '98765432100' }),
    );

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: undefined,
          taxIdentifier: '98765432100',
          password: undefined,
        }),
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve impedir reutilização da senha anterior', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    cryptographyService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: undefined,
          taxIdentifier: undefined,
          password: 'NewStrongPass123',
        }),
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cryptographyService.hash).not.toHaveBeenCalled();
  });

  it('deve remover campos administrativos quando o próprio usuário não é admin', async () => {
    const dto = makeUpdateUserDTO();
    const targetUser = makeUser({ id: 'self-id', email: 'john@doe.com' });
    const updatedUser = makeUser({ id: 'self-id', name: dto.name });

    findUserByIdUseCase.execute.mockResolvedValue(targetUser);
    findUserRoleUseCase.execute.mockResolvedValue('COLLABORATOR');
    findUserByEmailUseCase.execute.mockResolvedValue(null as never);
    findUserByTaxIdentifierUseCase.execute.mockResolvedValue(null as never);
    cryptographyService.compare.mockResolvedValue(false);
    cryptographyService.hash.mockResolvedValue('hashed-new-password');
    userRepository.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('self-id', dto, 'self-id');

    expect(userRepository.update).toHaveBeenCalledWith('self-id', {
      ...dto,
      password: 'hashed-new-password',
      roles: undefined,
      companyIds: undefined,
      isActive: undefined,
      isEmployee: undefined,
      isManager: undefined,
    });
    expect(result).toEqual(updatedUser);
  });

  it('deve permitir que admin atualize todos os campos e criptografe a nova senha', async () => {
    const dto = makeUpdateUserDTO();
    const plainPassword = dto.password;
    const updatedUser = makeUser({ id: 'target-id', name: dto.name });

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    findUserByEmailUseCase.execute.mockResolvedValue(null as never);
    findUserByTaxIdentifierUseCase.execute.mockResolvedValue(null as never);
    cryptographyService.compare.mockResolvedValue(false);
    cryptographyService.hash.mockResolvedValue('hashed-new-password');
    userRepository.update.mockResolvedValue(updatedUser);

    const result = await useCase.execute('target-id', dto, 'admin-id');

    expect(cryptographyService.compare).toHaveBeenCalledWith(
      plainPassword,
      'hashed-password',
    );
    expect(userRepository.update).toHaveBeenCalledWith('target-id', {
      ...dto,
      password: 'hashed-new-password',
    });
    expect(result).toEqual(updatedUser);
  });
});
