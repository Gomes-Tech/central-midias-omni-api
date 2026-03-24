import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { CreateCompanyDTO } from '../dto';
import { CompanyRepository } from '../repositories';

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
  ) {}

  async execute(data: CreateCompanyDTO) {
    const companyBySlug = await this.companyRepository.findBySlug(data.slug);

    if (companyBySlug) {
      throw new BadRequestException('Já existe uma organização com este slug');
    }

    const company = await this.companyRepository.create({
      name: data.name,
      slug: data.slug,
      logoUrl: data.logoUrl,
      isActive: data.isActive ?? true,
    });

    if (!company) {
      throw new BadRequestException('Erro ao criar organização');
    }

    return company;
  }
}
