import { Module } from '@nestjs/common';
import { CompanyController } from './organization.controller';
import { CompanyRepository } from './repositories';
import {
  CreateCompanyUseCase,
  DeleteCompanyUseCase,
  FindAllCompaniesUseCase,
  FindCompanyByIdUseCase,
  FindCompanyBySlugUseCase,
  UpdateCompanyUseCase,
} from './use-cases';

@Module({
  imports: [],
  controllers: [CompanyController],
  providers: [
    FindAllCompaniesUseCase,
    FindCompanyByIdUseCase,
    FindCompanyBySlugUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
    CompanyRepository,
    {
      provide: 'CompanyRepository',
      useExisting: CompanyRepository,
    },
  ],
  exports: [
    FindAllCompaniesUseCase,
    FindCompanyByIdUseCase,
    FindCompanyBySlugUseCase,
    CreateCompanyUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
    CompanyRepository,
    {
      provide: 'CompanyRepository',
      useExisting: CompanyRepository,
    },
  ],
})
export class CompanyModule {}
