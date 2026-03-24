import { BadRequestException, ForbiddenException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { UserRepository } from '../repository';
import { CreateUserUseCase } from './create-user.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserRoleUseCase } from './find-user-role.use-case';
import { makeCreateUserDTO, makeUser } from './test-helpers';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let findUserRoleUseCase: jest.Mocked<FindUserRoleUseCase>;

  beforeEach(() => {
    userRepository = {
      create: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    findByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    cryptographyService = {
      hash: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    findUserRoleUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserRoleUseCase>;

    useCase = new CreateUserUseCase(
      userRepository,
      findByEmailUseCase,
      cryptographyService,
      findUserRoleUseCase,
    );
  });

  it('deve impedir criação quando o solicitante não é admin', async () => {
    findUserRoleUseCase.execute.mockResolvedValue('COLLABORATOR');

    await expect(
      useCase.execute(makeCreateUserDTO(), 'requester-id'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(userRepository.create).not.toHaveBeenCalled();
    expect(cryptographyService.hash).not.toHaveBeenCalled();
  });

  it('deve impedir criação quando já existir usuário por email', async () => {
    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    findByEmailUseCase.execute.mockResolvedValue(makeUser());

    await expect(
      useCase.execute(makeCreateUserDTO(), 'requester-id'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('deve criar usuário com a senha criptografada', async () => {
    const dto = makeCreateUserDTO();
    const createdUser = makeUser({ email: dto.email });

    findUserRoleUseCase.execute.mockResolvedValue('ADMIN');
    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-secret');
    userRepository.create.mockResolvedValue(createdUser);

    const result = await useCase.execute(dto, 'requester-id');

    expect(cryptographyService.hash).toHaveBeenCalledWith(dto.password);
    expect(userRepository.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed-secret',
    });
    expect(result).toEqual(createdUser);
  });
});
