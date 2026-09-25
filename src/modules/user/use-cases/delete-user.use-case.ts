import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';
import { FindUserByIdUseCase } from './find-user-by-id.use-case';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
    private readonly findByIdUseCase: FindUserByIdUseCase,
  ) {}

  async execute(id: string, organizationId: string) {
    await this.findByIdUseCase.execute(id, organizationId);

    await this.userRepository.delete(id);
  }
}
