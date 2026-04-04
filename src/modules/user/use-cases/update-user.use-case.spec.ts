import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { makeUpdateUserDTO, makeUser } from './test-helpers';
import { UpdateUserUseCase } from './update-user.use-case';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findUserByIdUseCase: jest.Mocked<FindUserByIdUseCase>;
  let findUserByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;

  beforeEach(() => {
    userRepository = {
      update: jest.fn(),
      findByTaxIdentifier: jest.fn().mockResolvedValue(null),
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

    useCase = new UpdateUserUseCase(
      userRepository,
      findUserByIdUseCase,
      findUserByEmailUseCase,
      cryptographyService,
    );
  });

  it('deve impedir atualização com email duplicado', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
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

  it('deve seguir quando busca por novo email falhar (email disponível)', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id', email: 'old@test.com' }),
    );
    findUserByEmailUseCase.execute.mockRejectedValue(new Error('not found'));

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: 'brand-new@test.com',
          password: undefined,
        }),
        'admin-id',
      ),
    ).resolves.toBeUndefined();

    expect(userRepository.update).toHaveBeenCalled();
  });

  it('deve impedir reutilização da senha anterior', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    cryptographyService.compare.mockResolvedValue(true);

    await expect(
      useCase.execute(
        'target-id',
        makeUpdateUserDTO({
          email: undefined,
          password: 'NewStrongPass123',
        }),
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cryptographyService.hash).not.toHaveBeenCalled();
  });

  it('deve permitir que admin atualize todos os campos e criptografe a nova senha', async () => {
    const dto = makeUpdateUserDTO();
    const plainPassword = dto.password;

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id' }),
    );
    findUserByEmailUseCase.execute.mockResolvedValue(null as never);
    cryptographyService.compare.mockResolvedValue(false);
    cryptographyService.hash.mockResolvedValue('hashed-new-password');
    userRepository.update.mockResolvedValue();

    const result = await useCase.execute('target-id', dto, 'admin-id');

    expect(cryptographyService.compare).toHaveBeenCalledWith(
      plainPassword,
      'hashed-password',
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      {
        ...dto,
        password: 'hashed-new-password',
      },
      'admin-id',
    );
    expect(result).toBeUndefined();
  });

  it('deve permitir email igual ao do próprio usuário', async () => {
    const dto = makeUpdateUserDTO({
      email: 'john@doe.com',
      password: undefined,
    });

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id', email: 'john@doe.com' }),
    );

    await expect(
      useCase.execute('target-id', dto, 'admin-id'),
    ).resolves.toBeUndefined();

    expect(findUserByEmailUseCase.execute).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith(
      'target-id',
      dto,
      'admin-id',
    );
  });

  it('deve permitir manter o mesmo documento do usuário', async () => {
    const dto = makeUpdateUserDTO({
      email: undefined,
      password: undefined,
      taxIdentifier: '12345678901',
    });

    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id', taxIdentifier: '12345678901' }),
    );

    await expect(
      useCase.execute('target-id', dto, 'admin-id'),
    ).resolves.toBeUndefined();

    expect(userRepository.findByTaxIdentifier).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando outro usuário usar o mesmo documento', async () => {
    findUserByIdUseCase.execute.mockResolvedValue(
      makeUser({ id: 'target-id', taxIdentifier: '111' }),
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
          password: undefined,
          taxIdentifier: '999',
        }),
        'admin-id',
      ),
    ).rejects.toMatchObject({
      message: 'Já existe um usuário com este documento',
    });
  });
});
