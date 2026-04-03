import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { MailService } from '@infrastructure/providers';
import { FindRoleByIdUseCase } from '@modules/roles';
import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findByEmailUseCase: FindUserByEmailUseCase,
    private readonly cryptographyService: CryptographyService,
    private readonly mailService: MailService,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
  ) {}

  async execute(
    data: CreateUserDTO,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const userByEmail = await this.findByEmailUseCase
      .execute(data.email)
      .catch(() => null);

    if (userByEmail) {
      throw new BadRequestException('Usuário já existe! Tente outro email.');
    }

    const existingTax = await this.userRepository.findByTaxIdentifier(
      data.taxIdentifier,
    );
    if (existingTax) {
      throw new BadRequestException(
        'Já existe um usuário com este documento. Tente outro.',
      );
    }

    await this.findRoleByIdUseCase.execute(data.roleId);

    const hashedPassword = await this.cryptographyService.hash(
      data.taxIdentifier,
    );

    const newUser = await this.userRepository.create(
      {
        ...data,
        password: hashedPassword,
      },
      userId,
      organizationId,
    );

    if (!newUser) {
      throw new BadRequestException(
        'Ocorreu um erro ao criar o usuário! Tente novamente mais tarde!',
      );
    }

    if (process.env.NODE_ENV === 'prod') {
      await this.mailService.sendMail({
        to: data.email,
        subject: 'Bem-vindo ao sistema',
        template: 'welcome',
        context: {
          name: data.name,
          email: data.email,
          taxIdentifier: data.taxIdentifier,
        },
      });
    }
  }
}
