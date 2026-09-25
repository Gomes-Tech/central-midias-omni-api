import { Injectable } from '@nestjs/common';
import { MaterialTemplateRepository } from '../repository';
import { MaterialTemplateResponseService } from '../services';

@Injectable()
export class GetAdminMaterialTemplateUseCase {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly responseService: MaterialTemplateResponseService,
  ) {}

  async execute(materialId: string, organizationId: string) {
    const template = await this.repository.findOrThrow(
      materialId,
      organizationId,
    );
    return await this.responseService.resolve(template);
  }
}
