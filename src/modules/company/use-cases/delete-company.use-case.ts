import { Inject, Injectable } from '@nestjs/common';
import { CompanyRepository } from '../repositories';
import { FindCompanyByIdUseCase } from './find-company-by-id.use-case';

@Injectable()
export class DeleteCompanyUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(id: string) {
    await this.findCompanyByIdUseCase.execute(id);
    return this.companyRepository.delete(id);
  }
}
