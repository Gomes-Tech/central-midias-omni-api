import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Company, Prisma } from '@prisma/client';

@Injectable()
export class CompanyRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(): Promise<Company[]> {
    try {
      return await this.prisma.company.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    } catch (error) {
      this.logger.error('CompanyRepository.findAll falhou', error);
      throw new BadRequestException('Erro ao buscar organizações');
    }
  }

  async findById(id: string): Promise<Company | null> {
    try {
      const company = await this.prisma.company.findUnique({
        where: { id },
      });

      if (!company) {
        return null;
      }

      return company;
    } catch (error) {
      this.logger.error('CompanyRepository.findById falhou', error);
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async findBySlug(slug: string): Promise<Company | null> {
    try {
      return await this.prisma.company.findUnique({
        where: { slug },
      });
    } catch (error) {
      this.logger.error('CompanyRepository.findBySlug falhou', error);
      throw new BadRequestException('Erro ao buscar organização');
    }
  }

  async create(data: Prisma.CompanyCreateInput): Promise<Company> {
    try {
      return await this.prisma.company.create({
        data,
      });
    } catch (error) {
      this.logger.error('CompanyRepository.create falhou', error);
      throw new BadRequestException('Erro ao criar organização');
    }
  }

  async update(id: string, data: Prisma.CompanyUpdateInput): Promise<Company> {
    try {
      return await this.prisma.company.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error('CompanyRepository.update falhou', error);
      throw new BadRequestException('Erro ao atualizar organização');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.company.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      this.logger.error('CompanyRepository.delete falhou', error);
      throw new BadRequestException('Erro ao deletar organização');
    }
  }
}
