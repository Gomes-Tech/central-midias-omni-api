import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repository';

@Injectable()
export class FindAllTechniciansUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<{ id: string; name: string }[]> {
    return this.userRepository.findTechnicians();
  }
}
