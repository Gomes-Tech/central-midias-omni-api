import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';

@Injectable()
export class FindUsersSelectUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    organizationId: string,
  ): Promise<{ id: string; name: string }[]> {
    return await this.userRepository.findUsersSelect(organizationId);
  }
}
