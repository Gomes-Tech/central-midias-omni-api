import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { AcceptMaterialDTO } from '../dto';
import { MaterialRepository } from '../repository';

@Injectable()
export class AcceptMaterialUseCase {
  constructor(
    @Inject('MaterialRepository')
    private readonly materialRepository: MaterialRepository,
  ) {}

  async execute(
    materialId: string,
    organizationId: string,
    userId: string,
    dto: AcceptMaterialDTO,
  ): Promise<{ acceptedAt: Date }> {
    if (dto.accepted !== true) {
      throw new BadRequestException('É necessário confirmar a leitura do material');
    }

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

    const hasAccess = await this.materialRepository.userHasCategoryAccess(
      organizationId,
      material.categoryId,
      userId,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'Você não possui acesso a este material',
      );
    }

    const acceptedAt = new Date();

    await this.materialRepository.upsertAcceptance(
      materialId,
      userId,
      acceptedAt,
    );

    return { acceptedAt };
  }
}
