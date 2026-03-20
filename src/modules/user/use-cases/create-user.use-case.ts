import { BadRequestException, ForbiddenException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByTaxIdentifierUseCase } from './find-user-by-tax-identifier.use-case';
import { FindUserRoleUseCase } from './find-user-role.use-case';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findByEmailUseCase: FindUserByEmailUseCase,
    private readonly findByTaxIdentifierUseCase: FindUserByTaxIdentifierUseCase,
    private readonly cryptographyService: CryptographyService,
    private readonly findUserRoleUseCase: FindUserRoleUseCase,
  ) {}

  async execute(data: CreateUserDTO, userId: string) {
    const userRole = await this.findUserRoleUseCase.execute(userId);

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para criar usuários',
      );
    }

    const userByEmail = await this.findByEmailUseCase
      .execute(data.email)
      .catch(() => null);
    const userByTaxIdentifier = await this.findByTaxIdentifierUseCase
      .execute(data.taxIdentifier)
      .catch(() => null);

    if (userByEmail || userByTaxIdentifier) {
      throw new BadRequestException(
        'Usuário já existe! Tente outro email ou CPF.',
      );
    }

    const hashedPassword = await this.cryptographyService.hash(
      data.password ?? data.taxIdentifier,
    );

    const newUser = await this.userRepository.create({
      ...data,
      password: hashedPassword,
    });

    if (!newUser) {
      throw new BadRequestException(
        'Ocorreu um erro ao criar o usuário! Tente novamente mais tarde!',
      );
    }

    return newUser;
  }
}
