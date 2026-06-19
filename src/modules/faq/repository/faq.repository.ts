import { BadRequestException } from '@common/filters';
import { generateId } from '@common/utils';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResponse } from '../../../types';
import {
  CreateFaqDTO,
  CreateFaqItemDTO,
  FindAllFaqItemsFiltersDTO,
  FindAllFaqsFiltersDTO,
  UpdateFaqDTO,
  UpdateFaqItemDTO,
  UpsertFaqDetailDTO,
} from '../dto';
import { FaqItemDetail, FaqItemEntity, FaqList } from '../entities';

const faqListSelect = {
  id: true,
  name: true,
  order: true,
  isActive: true,
} satisfies Prisma.FaqSelect;

const faqItemSelect = {
  id: true,
  question: true,
  answer: true,
  order: true,
} satisfies Prisma.FaqItemSelect;

const faqDetailSelect = {
  id: true,
  imageKey: true,
  description: true,
  phonePrimary: true,
  phonePrimaryLabel: true,
  phonePrimaryIsWhatsapp: true,
  phoneSecondary: true,
  phoneSecondaryLabel: true,
  phoneSecondaryIsWhatsapp: true,
} satisfies Prisma.FaqDetailSelect;

@Injectable()
export class FaqRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(
    filters: FindAllFaqsFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<FaqList>> {
    const { onlyActive = false, page = 1, limit = 25, searchTerm } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.FaqWhereInput = {
        organizationId,
        isDeleted: false,
        ...(onlyActive ? { isActive: true } : {}),
        ...(searchTerm && {
          name: { contains: searchTerm, mode: 'insensitive' },
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.faq.findMany({
          where,
          select: faqListSelect,
          orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
          skip,
          take: limit,
        }),
        this.prisma.faq.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('FaqRepository.findAll falhou', {
        error: String(error),
        organizationId,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar FAQs');
    }
  }

  async findAllItems(
    filters: FindAllFaqItemsFiltersDTO = {},
    organizationId: string,
  ): Promise<PaginatedResponse<FaqItemEntity>> {
    const { onlyActive = false, page = 1, limit = 25, searchTerm } = filters;
    const skip = (page - 1) * limit;

    try {
      const where: Prisma.FaqItemWhereInput = {
        organizationId,
        isDeleted: false,
        faq: {
          isDeleted: false,
          ...(onlyActive ? { isActive: true } : {}),
        },
        ...(searchTerm && {
          OR: [
            { question: { contains: searchTerm, mode: 'insensitive' } },
            { answer: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }),
      };

      const [data, total] = await Promise.all([
        this.prisma.faqItem.findMany({
          where,
          select: faqItemSelect,
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.faqItem.count({ where }),
      ]);

      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      void this.logger.error('FaqRepository.findAllItems falhou', {
        error: String(error),
        organizationId,
        searchTerm,
      });

      throw new BadRequestException('Erro ao buscar items do FAQ');
    }
  }

  async findById(id: string, organizationId: string) {
    try {
      return await this.prisma.faq.findFirst({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          order: true,
          isActive: true,
          items: {
            where: { isDeleted: false },
            select: faqItemSelect,
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
          },
          detail: {
            select: faqDetailSelect,
          },
        },
      });
    } catch (error) {
      void this.logger.error('FaqRepository.findById falhou', {
        error: String(error),
        id,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar FAQ');
    }
  }

  async existsById(organizationId: string): Promise<{ id: string } | null> {
    const faq = await this.prisma.faq.findFirst({
      where: { organizationId, isDeleted: false },
      select: { id: true },
    });

    return faq ?? null;
  }

  async create(
    organizationId: string,
    data: CreateFaqDTO,
    userId: string,
  ): Promise<{ id: string }> {
    try {
      const id = generateId();

      await this.prisma.faq.create({
        data: {
          id,
          organizationId,
          name: data.name,
          order: data.order,
          isActive: data.isActive ?? true,
        },
      });

      void this.logger.info('FAQ criado', {
        faqId: id,
        organizationId,
        userId,
        name: data.name,
      });

      return { id };
    } catch (error) {
      void this.logger.error('FaqRepository.create falhou', {
        error: String(error),
        organizationId,
        userId,
        name: data.name,
      });

      throw new BadRequestException('Erro ao criar FAQ');
    }
  }

  async update(
    id: string,
    organizationId: string,
    data: UpdateFaqDTO,
    userId: string,
  ) {
    try {
      await this.prisma.faq.updateMany({
        where: {
          id,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.order !== undefined && { order: data.order }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      });

      void this.logger.info('FAQ atualizado', {
        faqId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.update falhou', {
        error: String(error),
        faqId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar FAQ');
    }
  }

  async softDelete(id: string, organizationId: string, userId: string) {
    try {
      await this.prisma.$transaction([
        this.prisma.faq.updateMany({
          where: {
            id,
            organizationId,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
        this.prisma.faqItem.updateMany({
          where: {
            faqId: id,
            organizationId,
            isDeleted: false,
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        }),
      ]);

      void this.logger.info('FAQ removido', {
        faqId: id,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.softDelete falhou', {
        error: String(error),
        faqId: id,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover FAQ');
    }
  }

  async findItemById(faqId: string, itemId: string, organizationId: string) {
    try {
      return await this.prisma.faqItem.findFirst({
        where: {
          id: itemId,
          faqId,
          organizationId,
          isDeleted: false,
        },
        select: faqItemSelect,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.findItemById falhou', {
        error: String(error),
        faqId,
        itemId,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar item do FAQ');
    }
  }

  async findItemByIdOnly(
    itemId: string,
    organizationId: string,
  ): Promise<FaqItemDetail | null> {
    try {
      const item = await this.prisma.faqItem.findFirst({
        where: {
          id: itemId,
          organizationId,
          isDeleted: false,
          faq: { isDeleted: false },
        },
        select: {
          ...faqItemSelect,
          faqId: true,
          faq: { select: { name: true } },
        },
      });

      if (!item) {
        return null;
      }

      return {
        id: item.id,
        question: item.question,
        answer: item.answer,
        order: item.order,
        faqId: item.faqId,
        faqName: item.faq.name,
      };
    } catch (error) {
      void this.logger.error('FaqRepository.findItemByIdOnly falhou', {
        error: String(error),
        itemId,
        organizationId,
      });

      throw new BadRequestException('Erro ao buscar item do FAQ');
    }
  }

  async createItem(
    faqId: string,
    organizationId: string,
    data: CreateFaqItemDTO,
    userId: string,
  ): Promise<{ id: string }> {
    try {
      const id = generateId();

      await this.prisma.faqItem.create({
        data: {
          id,
          faqId,
          organizationId,
          question: data.question,
          answer: data.answer,
          order: data.order,
        },
      });

      void this.logger.info('Item de FAQ criado', {
        faqItemId: id,
        faqId,
        organizationId,
        userId,
      });

      return { id };
    } catch (error) {
      void this.logger.error('FaqRepository.createItem falhou', {
        error: String(error),
        faqId,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao criar item do FAQ');
    }
  }

  async updateItem(
    itemId: string,
    organizationId: string,
    data: UpdateFaqItemDTO,
    userId: string,
  ) {
    try {
      await this.prisma.faqItem.updateMany({
        where: {
          id: itemId,
          organizationId,
          isDeleted: false,
        },
        data: {
          ...(data.question !== undefined && { question: data.question }),
          ...(data.answer !== undefined && { answer: data.answer }),
          ...(data.order !== undefined && { order: data.order }),
        },
      });

      void this.logger.info('Item de FAQ atualizado', {
        faqItemId: itemId,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.updateItem falhou', {
        error: String(error),
        faqItemId: itemId,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao atualizar item do FAQ');
    }
  }

  async softDeleteItem(itemId: string, organizationId: string, userId: string) {
    try {
      await this.prisma.faqItem.updateMany({
        where: {
          id: itemId,
          organizationId,
          isDeleted: false,
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      void this.logger.info('Item de FAQ removido', {
        faqItemId: itemId,
        organizationId,
        userId,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.softDeleteItem falhou', {
        error: String(error),
        faqItemId: itemId,
        organizationId,
        userId,
      });

      throw new BadRequestException('Erro ao remover item do FAQ');
    }
  }

  async upsertDetail(
    faqId: string,
    data: UpsertFaqDetailDTO & { imageKey?: string },
    userId: string,
  ) {
    try {
      await this.prisma.faqDetail.upsert({
        where: { faqId },
        create: {
          id: generateId(),
          faqId,
          description: data.description ?? null,
          imageKey: data.imageKey ?? null,
          phonePrimary: data.phonePrimary ?? null,
          phonePrimaryLabel: data.phonePrimaryLabel ?? null,
          phonePrimaryIsWhatsapp: data.phonePrimaryIsWhatsapp ?? false,
          phoneSecondary: data.phoneSecondary ?? null,
          phoneSecondaryLabel: data.phoneSecondaryLabel ?? null,
          phoneSecondaryIsWhatsapp: data.phoneSecondaryIsWhatsapp ?? false,
        },
        update: {
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.imageKey !== undefined && { imageKey: data.imageKey }),
          ...(data.phonePrimary !== undefined && {
            phonePrimary: data.phonePrimary,
          }),
          ...(data.phonePrimaryLabel !== undefined && {
            phonePrimaryLabel: data.phonePrimaryLabel,
          }),
          ...(data.phonePrimaryIsWhatsapp !== undefined && {
            phonePrimaryIsWhatsapp: data.phonePrimaryIsWhatsapp,
          }),
          ...(data.phoneSecondary !== undefined && {
            phoneSecondary: data.phoneSecondary,
          }),
          ...(data.phoneSecondaryLabel !== undefined && {
            phoneSecondaryLabel: data.phoneSecondaryLabel,
          }),
          ...(data.phoneSecondaryIsWhatsapp !== undefined && {
            phoneSecondaryIsWhatsapp: data.phoneSecondaryIsWhatsapp,
          }),
        },
      });

      void this.logger.info('Detalhe de FAQ atualizado', {
        faqId,
        userId,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.upsertDetail falhou', {
        error: String(error),
        faqId,
        userId,
      });

      throw new BadRequestException('Erro ao salvar detalhes do FAQ');
    }
  }

  async findDetailByFaqId(faqId: string) {
    try {
      return await this.prisma.faqDetail.findUnique({
        where: { faqId },
        select: faqDetailSelect,
      });
    } catch (error) {
      void this.logger.error('FaqRepository.findDetailByFaqId falhou', {
        error: String(error),
        faqId,
      });

      throw new BadRequestException('Erro ao buscar detalhes do FAQ');
    }
  }
}
