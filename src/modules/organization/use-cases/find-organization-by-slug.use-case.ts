import { NotFoundException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CompanyRepository } from '../repositories';

@Injectable()
export class FindCompanyBySlugUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(slug: string) {
    const company = await this.companyRepository.findBySlug(slug);

    if (!company) {
      throw new NotFoundException('Organização não encontrada');
    }

    return company;
  }
}
