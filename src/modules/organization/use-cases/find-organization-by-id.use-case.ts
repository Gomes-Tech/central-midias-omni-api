import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CompanyRepository } from '../repositories';

@Injectable()
export class FindCompanyByIdUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(id: string) {
    const company = await this.companyRepository.findById(id);

    if (!company) {
      throw new NotFoundException('Organização não encontrada');
    }

    return company;
  }
}
