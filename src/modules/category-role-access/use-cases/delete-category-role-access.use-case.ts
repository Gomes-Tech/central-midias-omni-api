import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CategoryRoleAccessRepository } from '../repository';

@Injectable()
export class DeleteCategoryRoleAccessUseCase {
  constructor(
    @Inject('CategoryRoleAccessRepository')
    private readonly categoryRoleAccessRepository: CategoryRoleAccessRepository,
  ) {}

  async execute(id: string, organizationId: string): Promise<void> {
    const row = await this.categoryRoleAccessRepository.findByIdAndOrganization(
      id,
      organizationId,
    );

    if (!row) {
      throw new NotFoundException('Vínculo não encontrado');
    }

    await this.categoryRoleAccessRepository.deleteById(id);
  }
}
