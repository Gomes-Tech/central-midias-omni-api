import { BadRequestException } from '@common/filters';
import { CryptographyService } from '@infrastructure/criptography';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateUserDTO } from '../dto';
import { UserRepository } from '../repository';
import { FindUserByEmailUseCase } from './find-user-by-email.use-case';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly findUserByEmailUseCase: FindUserByEmailUseCase,
    private readonly cryptographyService: CryptographyService,
  ) {}

  async execute(id: string, data: UpdateUserDTO, userId: string) {
    const user = await this.findUserByIdUseCase.execute(id);

    if (data.email && data.email !== user.email) {
      const userWithEmail = await this.findUserByEmailUseCase
        .execute(data.email)
        .catch(() => null);

      if (userWithEmail && userWithEmail.id !== id) {
        throw new BadRequestException('Já existe um usuário com este email');
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

    // if (!ADMIN_ROLE_NAMES.has(requesterRole)) {
    //   delete data.organizationIds;
    //   delete data.managerAssignments;
    //   delete data.isActive;
    // }

    return this.userRepository.update(id, data, userId);
  }
}
