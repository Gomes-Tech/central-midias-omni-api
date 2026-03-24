import { Module } from '@nestjs/common';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './repositories';
import {
  CreateOrganizationUseCase,
  DeleteOrganizationUseCase,
  FindAllOrganizationsUseCase,
  FindOrganizationByIdUseCase,
  FindOrganizationBySlugUseCase,
  UpdateOrganizationUseCase,
} from './use-cases';

@Module({
  imports: [],
  controllers: [OrganizationController],
  providers: [
    FindAllOrganizationsUseCase,
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
