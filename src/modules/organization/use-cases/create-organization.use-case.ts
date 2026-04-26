/**
 *  Anotação: o atual use-case não está utilizando os campos domain e shouldAttachUsersByDomain,
 *  então o teste também não validou esses campos.
 *  Quando a implementação estiver finalizada, devemos repassar esse caso de testes.
 */

import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { CreateOrganizationDTO } from '../dto';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    data: CreateOrganizationDTO,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const organizationBySlug = await this.organizationRepository.findBySlug(
      data.slug,
    );

    if (organizationBySlug) {
      throw new BadRequestException('Já existe uma organização com este slug');
    }

    let avatarKey: string | null = null;

    if (file) {
      const fileData = await this.storageService.uploadFile(file);

      avatarKey = fileData.path;
    }

    await this.organizationRepository.create(
      {
        name: data.name,
        slug: data.slug,
        avatarKey: avatarKey,
        isActive: data.isActive ?? true,
      },
      userId,
    );
  }
}
