import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { FindGlobalRoleByIdUseCase } from '@modules/roles';
import { UserById } from '../entities';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { makeUpdateUserDTO, makeUser } from './test-helpers';
import { UpdateUserUseCase } from './update-user.use-case';

function makeUserById(overrides: Partial<UserById> = {}): UserById {
  return {
    id: 'user-id',
    name: 'John Doe',
    email: 'john@doe.com',
    password: 'hashed-password',
    taxIdentifier: '12345678901',
    phone: null,
    socialReason: null,
    city: null,
    uf: null,
    avatarKey: null,
    isFirstAccess: true,
    isActive: true,
    isDeleted: false,
    canAccessBackoffice: false,
    globalRoleId: null,
    ...overrides,
  };
}

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let findGlobalRoleByIdUseCase: jest.Mocked<FindGlobalRoleByIdUseCase>;

  beforeEach(() => {
    userRepository = {
      update: jest.fn(),
      findByTaxIdentifier: jest.fn().mockResolvedValue(null),
      assertValidManagerAssignments: jest.fn().mockResolvedValue(undefined),
      hasPlatformAdminRole: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<UserRepository>;

    findUserByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByIdUseCase>;

    findUserByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;
    cryptographyService = {
      compare: jest.fn(),
      hash: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    findGlobalRoleByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindGlobalRoleByIdUseCase>;

    useCase = new UpdateUserUseCase(
      userRepository,
      findUserByIdUseCase,
      findUserByEmailUseCase,
      cryptographyService,
      findGlobalRoleByIdUseCase,
    );
  });

  it('deve impedir atualização com email duplicado', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    findUserByEmailUseCase.execute.mockResolvedValue(
      makeUser({ id: 'another-user', email: 'jane@doe.com' }),
    );

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({ email: 'jane@doe.com' }),
        'admin-id',
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith(
      'target-id',
      'org-1',
    );
  });

  it('deve seguir quando busca por novo email falhar (email disponível)', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id', email: 'old@test.com' }),
    );
    findUserByEmailUseCase.execute.mockRejectedValue(new Error('not found'));

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: 'brand-new@test.com',
        }),
        'admin-id',
        'org-1',
      ),
    ).resolves.toBeUndefined();

    expect(userRepository.update).toHaveBeenCalled();
  });

  it('deve impedir reutilização da senha anterior no first-access', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    cryptographyService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(
        'target-id',
        { password: 'NewStrongPass123', isFirstAccess: false },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cryptographyService.hash).not.toHaveBeenCalled();
  });

  it('deve ignorar password e isFirstAccess no PATCH org-scoped', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    userRepository.update.mockResolvedValue();

    await useCase.execute(
      'target-id',
      {
        name: 'Jane Doe',
        password: 'NewStrongPass123',
        isFirstAccess: false,
      },
      'editor-id',
      'org-1',
    );

    expect(cryptographyService.compare).not.toHaveBeenCalled();
    expect(cryptographyService.hash).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      { name: 'Jane Doe' },
      'editor-id',
      'org-1',
    );
  });

  it('deve criptografar a nova senha no first-access', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    cryptographyService.compare.mockResolvedValue(false);
    cryptographyService.hash.mockResolvedValue('hashed-new-password');
    userRepository.update.mockResolvedValue();

    await useCase.execute(
      'target-id',
      { isFirstAccess: false, password: 'NewStrongPass123' },
      'target-id',
    );

    expect(findUserByIdUseCase.execute).toHaveBeenCalledWith(
      'target-id',
      undefined,
    );
    expect(cryptographyService.compare).toHaveBeenCalledWith(
      'NewStrongPass123',
      'hashed-password',
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      {
        isFirstAccess: false,
        password: 'hashed-new-password',
      },
      'target-id',
      undefined,
    );
  });

  it('deve permitir email igual ao do próprio usuário', async () => {
    const dto = makeUpdateUserDTO({
      email: 'john@doe.com',
    });

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id', email: 'john@doe.com' }),
    );

    await expect(
      useCase.execute('target-id', dto, 'admin-id', 'org-1'),
    ).resolves.toBeUndefined();

    expect(findUserByEmailUseCase.execute).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      dto,
      'admin-id',
      'org-1',
    );
  });

  it('deve permitir manter o mesmo documento do usuário', async () => {
    const dto = makeUpdateUserDTO({
      email: undefined,
      taxIdentifier: '12345678901',
    });

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id', taxIdentifier: '12345678901' }),
    );

    await expect(
      useCase.execute('target-id', dto, 'admin-id', 'org-1'),
    ).resolves.toBeUndefined();

    expect(userRepository.findByTaxIdentifier).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando outro usuário usar o mesmo documento', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id', taxIdentifier: '111' }),
    );
    userRepository.findByTaxIdentifier.mockResolvedValue({
      id: 'other-id',
      taxIdentifier: '999',
    });

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: undefined,
          taxIdentifier: '999',
        }),
        'admin-id',
        'org-1',
      ),
    ).rejects.toMatchObject({
      message: 'Já existe um usuário com este documento',
    });
  });

  it('deve ignorar globalRoleId quando o actor não for ADMIN de plataforma', async () => {
    const dto = makeUpdateUserDTO({
      email: undefined,
      globalRoleId: 'global-role-id',
    });
    const { globalRoleId: _ignored, ...expected } = dto;
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    userRepository.hasPlatformAdminRole.mockResolvedValue(false);

    await useCase.execute('target-id', dto, 'editor-id', 'org-1');

    expect(findGlobalRoleByIdUseCase.execute).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      expected,
      'editor-id',
      'org-1',
    );
  });

  it('deve validar globalRoleId quando o actor for ADMIN de plataforma', async () => {
    const dto = makeUpdateUserDTO({
      email: undefined,
      globalRoleId: 'global-role-id',
    });
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUserById({ id: 'target-id' }),
    );
    userRepository.hasPlatformAdminRole.mockResolvedValue(true);
    findGlobalRoleByIdUseCase.execute.mockResolvedValue({} as never);

    await useCase.execute('target-id', dto, 'admin-id', 'org-1');

    expect(userRepository.hasPlatformAdminRole).toHaveBeenCalledWith(
      'admin-id',
    );
    expect(findGlobalRoleByIdUseCase.execute).toHaveBeenCalledWith(
      'global-role-id',
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      dto,
      'admin-id',
      'org-1',
    );
  });
});
