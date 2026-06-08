import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';

@Injectable()
export class FindGlobalUsersSelectUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<{ id: string; name: string }[]> {
    return await this.userRepository.findGlobalUsersSelect();
  }
}
