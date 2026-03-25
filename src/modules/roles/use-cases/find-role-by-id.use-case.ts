import { NotFoundException } from '@common/filters';
import { UserRepository } from '@modules/user/repository';
import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindRoleByIdUseCase {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async execute(id: string) {
    const role = await this.rolesRepository.findById(id);

    if (!role) {
      throw new NotFoundException('Perfil não encontrado');
    }

    return role;
  }
}

@Injectable()
export class FindRoleByUserIdUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string) {
    const result = await this.userRepository.findRoleByUserId(userId);

    if (!result) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return result;
  }
}
