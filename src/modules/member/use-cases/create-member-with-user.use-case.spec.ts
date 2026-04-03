import { MailService } from '@infrastructure/providers';
import { CreateUserUseCase } from '@modules/user/use-cases/create-user.use-case';
import { makeCreateUserDTO } from '@modules/user/use-cases/test-helpers';
import { CreateMemberWithUserUseCase } from './create-member-with-user.use-case';

describe('CreateMemberWithUserUseCase', () => {
  let createUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mailService: jest.Mocked<MailService>;
  let useCase: CreateMemberWithUserUseCase;
  let previousNodeEnv: string | undefined;

  beforeEach(() => {
    previousNodeEnv = process.env.NODE_ENV;

    createUserUseCase = {
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CreateUserUseCase>;

    mailService = {
      sendMail: jest.fn(),
    } as unknown as jest.Mocked<MailService>;

    useCase = new CreateMemberWithUserUseCase(createUserUseCase, mailService);
  });

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('deve delegar criação do usuário com organizationId', async () => {
    const dto = makeCreateUserDTO();

    await useCase.execute('org-id', dto, 'requester-id');

    expect(createUserUseCase.execute).toHaveBeenCalledWith(
      dto,
      'requester-id',
      'org-id',
    );
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('não deve enviar e-mail fora do ambiente prod', async () => {
    process.env.NODE_ENV = 'test';

    await useCase.execute('org-id', makeCreateUserDTO(), 'requester-id');

    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('deve enviar e-mail de boas-vindas em prod', async () => {
    process.env.NODE_ENV = 'prod';
    const dto = makeCreateUserDTO();

    await useCase.execute('org-id', dto, 'requester-id');

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
  });
});
