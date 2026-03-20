import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '../repository';

@Injectable()
export class FindUserByEmailUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(email: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
