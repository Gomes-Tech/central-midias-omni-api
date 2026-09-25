import { Injectable } from '@nestjs/common';
import { SaveMaterialTemplateDTO } from '../dto';
import { MaterialTemplateRepository } from '../repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateResponseService,
} from '../services';

@Injectable()
export class SaveMaterialTemplateUseCase {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly documentService: MaterialTemplateDocumentService,
    private readonly responseService: MaterialTemplateResponseService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
    dto: SaveMaterialTemplateDTO,
  ) {
    const template = await this.repository.findOrThrow(
      materialId,
      organizationId,
    );
    const document = this.documentService.validate(dto.document);
    const requestedAssetIds = this.documentService.getAssetIds(document);
    const existingAssets = await this.repository.findAssets(
      requestedAssetIds,
      organizationId,
    );
    const saved = await this.repository.save(
      template,
      dto.revision,
      document,
      existingAssets.map((asset) => asset.id),
      userId,
    );
    return await this.responseService.resolve(saved);
  }
}
