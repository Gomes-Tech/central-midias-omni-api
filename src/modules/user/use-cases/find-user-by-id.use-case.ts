import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { UserById } from '../entities';
import { UserRepository } from '../repository';

@Injectable()
export class FindUserByIdUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(id: string): Promise<UserById> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
