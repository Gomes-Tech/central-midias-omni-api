import { Inject, Injectable } from '@nestjs/common';
import { FindAllUsersFilters } from '../dto';
import { ListUser } from '../entities';
import { UserRepository } from '../repository';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(filters: FindAllUsersFilters): Promise<{
    data: ListUser[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.userRepository.findAll(filters);
  }
}
