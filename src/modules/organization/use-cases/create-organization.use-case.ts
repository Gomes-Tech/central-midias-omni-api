import { BadRequestException, ForbiddenException } from '@common/filters';
import { StorageService } from '@infrastructure/providers';
import { FindUserRoleUseCase } from '@modules/user';
import { Inject, Injectable } from '@nestjs/common';
import { CreateOrganizationDTO } from '../dto';
import { OrganizationRepository } from '../repositories';

@Injectable()
export class CreateOrganizationUseCase {
  constructor(
    @Inject('OrganizationRepository')
    private readonly organizationRepository: OrganizationRepository,
    private readonly findUserRoleUseCase: FindUserRoleUseCase,
    private readonly storageService: StorageService,
  ) {}

  async execute(
    data: CreateOrganizationDTO,
    userId: string,
    file?: Express.Multer.File,
  ) {
    const userRole = await this.findUserRoleUseCase.execute(userId);

    if (userRole !== 'ADMIN') {
      throw new ForbiddenException(
        'Você não tem permissão para criar organizações',
      );
    }

    const organizationBySlug = await this.organizationRepository.findBySlug(
      data.slug,
    );

    if (organizationBySlug) {
      throw new BadRequestException('Já existe uma organização com este slug');
    }

    let avatarUrl: string | null = null;

    if (file) {
      const fileData = await this.storageService.uploadFile(file);

      avatarUrl = fileData.publicUrl;
    }

    const organization = await this.organizationRepository.create({
      name: data.name,
      slug: data.slug,
      avatarUrl: avatarUrl,
      isActive: data.isActive ?? true,
    });

    if (!organization) {
      throw new BadRequestException('Erro ao criar organização');
    }
  }
}
