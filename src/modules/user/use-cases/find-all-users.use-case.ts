import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindAllUsersFiltersDTO } from '../dto';
import { ListUser } from '../entities';
import { UserRepository } from '../repository';

@Injectable()
export class FindAllUsersUseCase {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(
    filters: FindAllUsersFiltersDTO,
    organizationId: string,
  ): Promise<PaginatedResponse<ListUser>> {
    return await this.userRepository.findAll(filters, organizationId);
  }
}
