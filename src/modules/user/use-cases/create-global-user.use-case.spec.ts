import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { UserRepository } from '../repository';
import { CreateGlobalUserUseCase } from './create-global-user.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { makeCreateGlobalUserDTO, makeUser } from './test-helpers';

describe('CreateGlobalUserUseCase', () => {
  let useCase: CreateGlobalUserUseCase;
  let userRepository: jest.Mocked<
    Pick<UserRepository, 'findByTaxIdentifier' | 'createGlobalUser'>
  >;
  let findByEmailUseCase: jest.Mocked<FindUserByEmailUseCase>;
  let cryptographyService: jest.Mocked<CryptographyService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(() => {
    userRepository = {
      findByTaxIdentifier: jest.fn().mockResolvedValue(null),
      createGlobalUser: jest.fn(),
    };

    findByEmailUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<FindUserByEmailUseCase>;

    cryptographyService = {
      hash: jest.fn(),
    } as unknown as jest.Mocked<CryptographyService>;

    mailService = {
      sendMail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    useCase = new CreateGlobalUserUseCase(
      userRepository as unknown as UserRepository,
      findByEmailUseCase,
      cryptographyService,
      mailService,
    );
  });

  it('deve criar usuário global com senha derivada do documento e não enviar email fora de prod', async () => {
    const dto = makeCreateGlobalUserDTO();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-tax');
    userRepository.createGlobalUser.mockResolvedValue({ id: 'new-user-id' });

    try {
      await useCase.execute(dto, 'requester-id');

      expect(cryptographyService.hash).toHaveBeenCalledWith(dto.taxIdentifier);
      expect(userRepository.createGlobalUser).toHaveBeenCalledWith(
        {
          ...dto,
          password: 'hashed-tax',
        },
        'requester-id',
      );
      expect(mailService.sendMail).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('deve lançar BadRequest quando o email já estiver em uso', async () => {
    const dto = makeCreateGlobalUserDTO();

    findByEmailUseCase.execute.mockResolvedValue(
      makeUser({ email: dto.email }),
    );

    const errEmail = await useCase
      .execute(dto, 'requester-id')
      .catch((e: unknown) => e);
    expect(errEmail).toBeInstanceOf(BadRequestException);
    expect(errEmail).toMatchObject({
      message: 'Usuário já existe! Tente outro email.',
    });
    expect(userRepository.createGlobalUser).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o documento já estiver em uso', async () => {
    const dto = makeCreateGlobalUserDTO();

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    userRepository.findByTaxIdentifier.mockResolvedValue({
      id: 'existing',
    } as never);

    const errTax = await useCase
      .execute(dto, 'requester-id')
      .catch((e: unknown) => e);
    expect(errTax).toBeInstanceOf(BadRequestException);
    expect(errTax).toMatchObject({
      message: 'Já existe um usuário com este documento. Tente outro.',
    });
    expect(cryptographyService.hash).not.toHaveBeenCalled();
  });

  it('deve lançar BadRequest quando o repositório não retornar o usuário criado', async () => {
    const dto = makeCreateGlobalUserDTO();

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-tax');
    userRepository.createGlobalUser.mockResolvedValue(
      null as unknown as { id: string },
    );

    const errCreate = await useCase
      .execute(dto, 'requester-id')
      .catch((e: unknown) => e);
    expect(errCreate).toBeInstanceOf(BadRequestException);
    expect(errCreate).toMatchObject({
      message:
        'Ocorreu um erro ao criar o usuário! Tente novamente mais tarde!',
    });
  });

  it('deve enviar email de boas-vindas quando NODE_ENV for prod', async () => {
    const dto = makeCreateGlobalUserDTO();
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'prod';

    findByEmailUseCase.execute.mockRejectedValue(new Error('not found'));
    cryptographyService.hash.mockResolvedValue('hashed-tax');
    userRepository.createGlobalUser.mockResolvedValue({ id: 'new-user-id' });

    try {
      await useCase.execute(dto, 'requester-id');

      expect(mailService.sendMail).toHaveBeenCalledWith({
        to: dto.email,
        subject: 'Bem-vindo ao sistema',
        template: 'welcome',
        context: {
          name: dto.name,
          email: dto.email,
          taxIdentifier: dto.taxIdentifier,
        },
      });
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });
});
