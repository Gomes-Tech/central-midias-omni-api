import { BadRequestException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateOrganizationDTO } from '../dto';
import { OrganizationRepository } from '../repositories';
import { FindOrganizationByIdUseCase } from './find-organization-by-id.use-case';

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    id: string,
    data: UpdateOrganizationDTO,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const organization = await this.findOrganizationByIdUseCase.execute(id);

    if (data.slug && data.slug !== organization.slug) {
      const organizationBySlug = await this.organizationRepository.findBySlug(
        data.slug,
      );

      if (organizationBySlug && organizationBySlug.id !== id) {
        throw new BadRequestException(
          'Já existe uma organização com este slug',
        );
      }
    }

    let avatarKey: string | null = null;

    if (file) {
      const fileData = await this.storageService.uploadFile(file);

      avatarKey = fileData.publicUrl;
    }

    return this.organizationRepository.update(
      id,
      {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(avatarKey !== null && { avatarKey: avatarKey }),
        ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
      },
      userId,
    );
  }
}
