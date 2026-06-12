import { BadRequestException, NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import {
  buildMaterialAcceptanceCsv,
  buildMaterialAcceptanceExportFilename,
} from '../utils/material-acceptance-csv';
import { MaterialRepository } from '../repository';

@Injectable()
export class ExportMaterialAcceptanceReportUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
  ): Promise<{ filename: string; content: string }> {
    const material = await this.materialRepository.findById(
      materialId,
      organizationId,
    );

    if (!material) {
      throw new NotFoundException('Material não encontrado');
    }

    if (!material.requiresAcceptance) {
      throw new BadRequestException(
        'Este material não exige confirmação de leitura',
      );
    }

    const rows = await this.materialRepository.findAcceptanceReportRows(
      materialId,
      organizationId,
    );

    return {
      filename: buildMaterialAcceptanceExportFilename(material.name),
      content: buildMaterialAcceptanceCsv(rows),
    };
  }
}
