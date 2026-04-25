import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './repositories';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindAllSelectOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  FindOrganizationBySlugUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

@Module({
  imports: [UserModule],
  controllers: [OrganizationController],
  providers: [
    FindAllOrganizationsUseCase,
    FindAllSelectOrganizationsUseCase,
    FindOrganizationByIdUseCase,
    FindOrganizationBySlugUseCase,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    DeleteOrganizationUseCase,
    OrganizationRepository,
    {
      provide: 'OrganizationRepository',
      useExisting: OrganizationRepository,
    },
  ],
  exports: [
    FindAllOrganizationsUseCase,
    FindAllSelectOrganizationsUseCase,
    FindOrganizationByIdUseCase,
    FindOrganizationBySlugUseCase,
    CreateOrganizationUseCase,
    UpdateOrganizationUseCase,
    DeleteOrganizationUseCase,
    OrganizationRepository,
    {
      provide: 'OrganizationRepository',
      useExisting: OrganizationRepository,
    },
  ],
})
export class OrganizationModule {}
