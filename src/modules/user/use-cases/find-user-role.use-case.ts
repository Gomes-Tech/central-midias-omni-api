import { Injectable } from '@nestjs/common';
import { FindPrimaryUserRoleUseCase } from '@modules/user-roles';

@Injectable()
export class FindUserRoleUseCase {
  constructor(
    private readonly findPrimaryUserRoleUseCase: FindPrimaryUserRoleUseCase,
  ) {}

  async execute(userId: string) {
    return this.findPrimaryUserRoleUseCase.execute(userId);
  }
}
