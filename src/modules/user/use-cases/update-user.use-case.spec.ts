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
});
