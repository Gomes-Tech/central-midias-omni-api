import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';
import { NotFoundException } from '@common/filters';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
