import { CryptographyService } from '@infrastructure/criptography';
import { UserRepository } from '../repository';
import { CreateUserUseCase } from './create-user.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { makeCreateUserDTO, makeUser } from './test-helpers';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
      findByTaxIdentifier: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<UserRepository>;

    findByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    cryptographyService = {
      hash: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    useCase = new CreateUserUseCase(
      userRepository,
      findByEmailUseCase,
      cryptographyService,
    );
  });

  it('deve criar usuário com a senha criptografada', async () => {
    const dto = makeCreateUserDTO();
    const createdUser = makeUser({ email: dto.email });

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-secret');
    userRepository.create.mockResolvedValue({ id: createdUser.id });

    const result = await useCase.execute(dto, 'requester-id');

    expect(cryptographyService.hash).toHaveBeenCalledWith(dto.password);
    expect(userRepository.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed-secret',
    });
    expect(result).toEqual({ id: createdUser.id });
  });
});
