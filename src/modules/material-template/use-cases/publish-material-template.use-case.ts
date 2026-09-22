import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { PrintPreflightService } from '@modules/print/services/print-preflight.service';
import { Inject, Injectable, Optional, forwardRef } from '@nestjs/common';
import { PublishMaterialTemplateDTO } from '../dto';
import { MaterialTemplateDocument } from '../entities';
import { MaterialTemplateRepository, MaterialTemplateRow } from '../repository';
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
    @Optional()
    @Inject(forwardRef(() => PrintPreflightService))
    private readonly printPreflight?: PrintPreflightService,
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
    if (!template.document) {
      throw new BadRequestException('Salve o template antes de publicar');
    }
    const document = this.documentService.validate(template.document);
    await this.assertPagesMatchImages(template, document);
    const assetIds = this.documentService.getAssetIds(document);
    const assets = await this.repository.findAssets(assetIds, organizationId);
    if (assets.length !== assetIds.length) {
      throw new BadRequestException(
        'Substitua os assets ausentes antes de publicar',
      );
    }
    if (template.printPresetId) {
      if (!this.printPreflight) {
        throw new BadRequestException(
          'O preflight de impressão está indisponível',
        );
      }
      const preflight = await this.printPreflight.run(
        materialId,
        organizationId,
      );
      if (preflight.status !== 'READY') {
        throw new BadRequestException(
          preflight.issues[0]?.message ??
            'Corrija o preflight antes de publicar o template',
        );
      }
    }
    const published = await this.repository.publish(
      template,
      dto.revision,
      userId,
    );
    return await this.responseService.resolve(published);
  }

  private async assertPagesMatchImages(
    template: MaterialTemplateRow,
    document: MaterialTemplateDocument,
  ): Promise<void> {
    const files = template.material.materialFiles;
    const fileIds = new Set(files.map((file) => file.id));
    const pageFileIds =
      document.version === 3
        ? document.pages.map((page) => page.materialFileId)
        : [template.baseFile!.id];
    if (
      pageFileIds.length !== files.length ||
      pageFileIds.some((fileId) => !fileIds.has(fileId))
    ) {
      throw new BadRequestException(
        'As páginas do template não correspondem às imagens atuais',
      );
    }
    for (const file of files) {
      const buffer = await this.storageService.readFile(file.imageKey);
      this.imageService.validate({ buffer, size: file.size });
    }
  }
}
