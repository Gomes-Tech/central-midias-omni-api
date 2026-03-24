import { Inject, Injectable } from '@nestjs/common';
import { CompanyEntity } from '../entities';
import { CompanyRepository } from '../repositories';

@Injectable()
export class FindAllCompaniesUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(): Promise<CompanyEntity[]> {
    return this.companyRepository.findAll();
  }
}
