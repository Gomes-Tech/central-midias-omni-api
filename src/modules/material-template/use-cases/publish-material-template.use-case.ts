import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Injectable } from '@nestjs/common';
import { PublishMaterialTemplateDTO } from '../dto';
import { MaterialTemplateRepository } from '../repository';
import {
  MaterialTemplateDocumentService,
  MaterialTemplateImageService,
  MaterialTemplateResponseService,
} from '../services';

@Injectable()
export class PublishMaterialTemplateUseCase {
  constructor(
    private readonly repository: MaterialTemplateRepository,
    private readonly documentService: MaterialTemplateDocumentService,
    private readonly imageService: MaterialTemplateImageService,
    private readonly responseService: MaterialTemplateResponseService,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
    dto: PublishMaterialTemplateDTO,
  ) {
    const template = await this.repository.findOrThrow(
      materialId,
      organizationId,
    );
    this.repository.assertMaterialCanPublish(template);
    const baseFile = template.baseFile!;
    const baseBuffer = await this.storageService.readFile(baseFile.imageKey);
    this.imageService.validate({ buffer: baseBuffer, size: baseFile.size });
    if (!template.document) {
      throw new BadRequestException('Salve o template antes de publicar');
    }
    const document = this.documentService.validate(template.document);
    if (!this.documentService.hasEditableText(document)) {
      throw new BadRequestException(
        'O template precisa possuir ao menos um texto editável',
      );
    }
    const assetIds = this.documentService.getAssetIds(document);
    const assets = await this.repository.findAssets(assetIds, organizationId);
    if (assets.length !== assetIds.length) {
      throw new BadRequestException(
        'Substitua os assets ausentes antes de publicar',
      );
    }
    const published = await this.repository.publish(
      template,
      dto.revision,
      userId,
    );
    return await this.responseService.resolve(published);
  }
}
