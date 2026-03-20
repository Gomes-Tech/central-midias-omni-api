import { BadRequestException, ForbiddenException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateUserDTO } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByTaxIdentifierUseCase } from './find-user-by-tax-identifier.use-case';
import { FindUserRoleUseCase } from './find-user-role.use-case';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly findUserByTaxIdentifierUseCase: FindUserByTaxIdentifierUseCase,
    private readonly findUserRoleUseCase: FindUserRoleUseCase,
    private readonly cryptographyService: CryptographyService,
  ) {}

  async execute(id: string, data: UpdateUserDTO, userId: string) {
    const user = await this.findUserByIdUseCase.execute(id);
    const requesterRole = await this.findUserRoleUseCase.execute(userId);

    if (requesterRole !== 'ADMIN' && user.id !== userId) {
      throw new ForbiddenException('Você só pode atualizar o próprio usuário');
    }

    if (data.email && data.email !== user.email) {
      const userWithEmail = await this.findUserByEmailUseCase
        .execute(data.email)
        .catch(() => null);

      if (userWithEmail && userWithEmail.id !== id) {
        throw new BadRequestException('Já existe um usuário com este email');
      }
    }

    if (data.taxIdentifier && data.taxIdentifier !== user.taxIdentifier) {
      const userWithTaxIdentifier = await this.findUserByTaxIdentifierUseCase
        .execute(data.taxIdentifier)
        .catch(() => null);

      if (userWithTaxIdentifier && userWithTaxIdentifier.id !== id) {
        throw new BadRequestException('Já existe um usuário com este CPF/CNPJ');
      }
    }

    if (data.password) {
      const isOldPassword = await this.cryptographyService.compare(
        data.password,
        user.password,
      );

      if (isOldPassword) {
        throw new BadRequestException(
          'A senha nova não pode ser igual à uma senha anterior!',
        );
      }

      data.password = await this.cryptographyService.hash(data.password);
    }

    if (requesterRole !== 'ADMIN') {
      delete data.roles;
      delete data.companyIds;
      delete data.isActive;
      delete data.isEmployee;
      delete data.isManager;
    }

    return this.userRepository.update(id, data);
  }
}
