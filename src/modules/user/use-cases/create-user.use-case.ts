import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDTO } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';

// const ADMIN_ROLE_NAMES = new Set(['ADMIN', 'SUPER_ADMIN']);

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findByEmailUseCase: FindUserByEmailUseCase,
    private readonly cryptographyService: CryptographyService,
  ) {}

  async execute(data: CreateUserDTO, userId: string) {
    const userByEmail = await this.findByEmailUseCase
      .execute(data.email)
      .catch(() => null);
    if (userByEmail) {
      throw new BadRequestException('Usuário já existe! Tente outro email.');
    }

    const hashedPassword = await this.cryptographyService.hash(data.password);

    const newUser = await this.userRepository.create(
      {
        ...data,
        password: hashedPassword,
      },
      userId,
    );

    if (!newUser) {
      throw new BadRequestException(
        'Ocorreu um erro ao criar o usuário! Tente novamente mais tarde!',
      );
    }

    return newUser;
  }
}
