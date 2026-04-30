import { UserModule } from '@modules/user';
import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './repositories';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAccessibleOrganizationsUseCase,
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
    FindAccessibleOrganizationsUseCase,
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
    FindAccessibleOrganizationsUseCase,
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
