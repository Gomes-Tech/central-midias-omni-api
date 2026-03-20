import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';
import { NotFoundException } from '@common/filters';

@Injectable()
export class FindUserByTaxIdentifierUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(taxIdentifier: string) {
    const user = await this.userRepository.findByTaxIdentifier(taxIdentifier);

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }
}
