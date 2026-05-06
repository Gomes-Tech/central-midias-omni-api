import { Inject, Injectable } from '@nestjs/common';
import { RolesRepository } from '../repository';

@Injectable()
export class FindUserBackofficeAccessUseCase {
  constructor(
    @Inject('RolesRepository')
    private readonly rolesRepository: RolesRepository,
  ) {}

  async execute(userId: string): Promise<{ canAccessBackoffice: boolean }> {
    const canAccessBackoffice =
      await this.rolesRepository.findCanAccessBackofficeByUserId(userId);

    return { canAccessBackoffice };
  }
}
