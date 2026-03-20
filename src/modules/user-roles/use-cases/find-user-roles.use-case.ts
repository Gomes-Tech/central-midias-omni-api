import { Injectable } from '@nestjs/common';
import { UserRolesRepository } from '../repository';

@Injectable()
export class FindUserRolesUseCase {
  constructor(private readonly userRolesRepository: UserRolesRepository) {}

  async execute(userId: string) {
    return this.userRolesRepository.findByUserId(userId);
  }
}
