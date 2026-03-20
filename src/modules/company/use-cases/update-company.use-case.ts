import { BadRequestException } from '@common/filters';
import { Inject, Injectable } from '@nestjs/common';
import { UpdateCompanyDTO } from '../dto';
import { CompanyRepository } from '../repositories';
import { FindCompanyByIdUseCase } from './find-company-by-id.use-case';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    @Inject('CompanyRepository')
    private readonly companyRepository: CompanyRepository,
    private readonly findCompanyByIdUseCase: FindCompanyByIdUseCase,
  ) {}

  async execute(id: string, data: UpdateCompanyDTO) {
    const company = await this.findCompanyByIdUseCase.execute(id);

    if (data.slug && data.slug !== company.slug) {
      const companyBySlug = await this.companyRepository.findBySlug(data.slug);

      if (companyBySlug && companyBySlug.id !== id) {
        throw new BadRequestException('Já existe uma organização com este slug');
      }
    }

    return this.companyRepository.update(id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      ...(typeof data.isActive === 'boolean' && { isActive: data.isActive }),
    });
  }
}
