import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';
import { NotFoundException } from '@common/filters';

@Injectable()
export class FindUserRoleUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(userId: string) {
    const role = await this.userRepository.findRoleByUserId(userId);

    if (!role) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return role;
  }
}
