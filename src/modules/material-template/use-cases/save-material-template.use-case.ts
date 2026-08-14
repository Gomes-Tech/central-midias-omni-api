import { BadRequestException } from '@common/filters';
import { PrismaService } from '@infrastructure/prisma';
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
    private readonly prisma: PrismaService,
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
    const delivery = dto.delivery
      ? {
          digitalExportMimeType: dto.delivery.digital?.mimeType ?? null,
          printPresetId: dto.delivery.print?.presetId ?? null,
        }
      : undefined;
    if (
      delivery &&
      !delivery.digitalExportMimeType &&
      !delivery.printPresetId
    ) {
      throw new BadRequestException(
        'Selecione ao menos um formato de entrega para o template',
      );
    }
    if (delivery?.printPresetId) {
      const preset = await this.prisma.printPreset.findFirst({
        where: {
          id: delivery.printPresetId,
          organizationId,
          isActive: true,
          colorProfile: { isActive: true },
        },
        select: { id: true },
      });
      if (!preset) {
        throw new BadRequestException('Preset de impressão indisponível');
      }
    }
    const saved = await this.repository.save(
      template,
      dto.revision,
      document,
      existingAssets.map((asset) => asset.id),
      userId,
      delivery,
    );
    return await this.responseService.resolve(saved);
  }
}
