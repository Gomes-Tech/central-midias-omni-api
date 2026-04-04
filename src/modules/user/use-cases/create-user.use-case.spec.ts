import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { FindRoleByIdUseCase } from '@modules/roles';
import { UserRepository } from '../repository';
import { CreateUserUseCase } from './create-user.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { makeCreateUserDTO, makeUser } from './test-helpers';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let findByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let mailService: jest.Mocked<MailService>;
  let findRoleByIdUseCase: jest.Mocked<FindRoleByIdUseCase>;

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

    mailService = {
      sendMail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    findRoleByIdUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindRoleByIdUseCase>;

    useCase = new CreateUserUseCase(
      userRepository,
      findByEmailUseCase,
      cryptographyService,
      mailService,
      findRoleByIdUseCase,
    );
  });

  it('deve criar usuário com a senha criptografada', async () => {
    const dto = makeCreateUserDTO();
    const createdUser = makeUser({ email: dto.email });

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-secret');
    userRepository.create.mockResolvedValue({ id: createdUser.id });

    const result = await useCase.execute(
      dto,
      'requester-id',
      'organization-id',
    );

    expect(cryptographyService.hash).toHaveBeenCalledWith(dto.taxIdentifier);
    expect(userRepository.create).toHaveBeenCalledWith(
      {
        ...dto,
        password: 'hashed-secret',
      },
      'requester-id',
      'organization-id',
    );
    expect(mailService.sendMail).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('deve lançar BadRequest quando o email já existir', async () => {
    const dto = makeCreateUserDTO();
    findByEmailUseCase.execute.mockResolvedValue(makeUser({ email: dto.email }));

    await expect(
      useCase.execute(dto, 'requester-id', 'organization-id'),
    ).rejects.toMatchObject({ message: 'Usuário já existe! Tente outro email.' });

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o documento já estiver em uso', async () => {
    const dto = makeCreateUserDTO();
    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    userRepository.findByTaxIdentifier.mockResolvedValue({
      id: 'other',
      taxIdentifier: dto.taxIdentifier,
    });

    await expect(
      useCase.execute(dto, 'requester-id', 'organization-id'),
    ).rejects.toMatchObject({
      message: 'Já existe um usuário com este documento. Tente outro.',
    });

    expect(findRoleByIdUseCase.execute).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando create retornar vazio', async () => {
    const dto = makeCreateUserDTO();
    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-secret');
    userRepository.create.mockResolvedValue(null as never);

    await expect(
      useCase.execute(dto, 'requester-id', 'organization-id'),
    ).rejects.toMatchObject({
      message:
        'Ocorreu um erro ao criar o usuário! Tente novamente mais tarde!',
    });

    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('deve enviar email de boas-vindas em produção', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'prod';

    const dto = makeCreateUserDTO();
    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-secret');
    userRepository.create.mockResolvedValue({ id: 'new-id' });

    try {
      await useCase.execute(dto, 'requester-id', 'organization-id');

      expect(mailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dto.email,
          subject: 'Bem-vindo ao sistema',
          template: 'welcome',
          context: expect.objectContaining({
            name: dto.name,
            email: dto.email,
            taxIdentifier: dto.taxIdentifier,
          }),
        }),
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
