import { BadRequestException } from '@common/filters';
import { LoggerService } from '@infrastructure/log';
import { PrismaService } from '@infrastructure/prisma';
import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../../../types';
import { FindReportFiltersDTO } from '../dto';
import {
  TopMaterialByDownloadRow,
  TopMaterialByViewRow,
  TopUserByMaterialDownloadRow,
  TopUserByPlatformLoginRow,
} from '../entities';

type PaginationParams = {
  page: number;
  limit: number;
  offset: number;
};

@Injectable()
export class ReportRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findTopUsersByPlatformLogins(
    organizationId: string,
    filters: FindReportFiltersDTO = {},
  ): Promise<PaginatedResponse<TopUserByPlatformLoginRow>> {
    const { page, limit, offset } = this.resolvePagination(filters);

    try {
      const [rows, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<
          {
            user_id: string;
            name: string;
            email: string;
            login_count: bigint;
            last_login_at: Date | null;
          }[]
        >(
          `
          SELECT
            u.id AS user_id,
            u.name,
            u.email,
            COUNT(e.id)::bigint AS login_count,
            MAX(upl.last_login_at) AS last_login_at
          FROM user_platform_login_events e
          JOIN users u ON u.id = e.user_id
          JOIN members m ON m.user_id = u.id AND m.organization_id = $1
          LEFT JOIN user_platform_logins upl ON upl.user_id = u.id
          WHERE u.is_deleted = false
          GROUP BY u.id, u.name, u.email
          ORDER BY login_count DESC, u.name ASC
          LIMIT $2 OFFSET $3
          `,
          organizationId,
          limit,
          offset,
        ),
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
          `
          SELECT COUNT(*)::bigint AS total
          FROM (
            SELECT u.id
            FROM user_platform_login_events e
            JOIN users u ON u.id = e.user_id
            JOIN members m ON m.user_id = u.id AND m.organization_id = $1
            WHERE u.is_deleted = false
            GROUP BY u.id
          ) grouped_users
          `,
          organizationId,
        ),
      ]);

      const total = Number(countResult[0]?.total ?? 0);

      return {
        data: rows.map((row) => ({
          userId: row.user_id,
          name: row.name,
          email: row.email,
          loginCount: Number(row.login_count),
          lastLoginAt: row.last_login_at,
        })),
        total,
        totalPages: Math.ceil(total / limit) || 0,
        page,
      };
    } catch (error) {
      void this.logger.error(
        'ReportRepository.findTopUsersByPlatformLogins falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar relatório de usuários por login',
      );
    }
  }

  async findAllTopUsersByPlatformLogins(
    organizationId: string,
  ): Promise<TopUserByPlatformLoginRow[]> {
    const result = await this.findTopUsersByPlatformLogins(organizationId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });

    return result.data;
  }

  async findTopUsersByMaterialDownloads(
    organizationId: string,
    filters: FindReportFiltersDTO = {},
  ): Promise<PaginatedResponse<TopUserByMaterialDownloadRow>> {
    const { page, limit, offset } = this.resolvePagination(filters);

    try {
      const [rows, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<
          {
            user_id: string;
            name: string;
            email: string;
            download_count: bigint;
          }[]
        >(
          `
          SELECT
            u.id AS user_id,
            u.name,
            u.email,
            COUNT(d.id)::bigint AS download_count
          FROM material_downloads d
          JOIN materials mat ON mat.id = d.material_id
          JOIN categories c ON c.id = mat.category_id
          JOIN users u ON u.id = d.user_id
          JOIN members m ON m.user_id = u.id AND m.organization_id = $1
          WHERE c.organization_id = $1
            AND mat.deleted_at IS NULL
            AND u.is_deleted = false
          GROUP BY u.id, u.name, u.email
          ORDER BY download_count DESC, u.name ASC
          LIMIT $2 OFFSET $3
          `,
          organizationId,
          limit,
          offset,
        ),
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
          `
          SELECT COUNT(*)::bigint AS total
          FROM (
            SELECT u.id
            FROM material_downloads d
            JOIN materials mat ON mat.id = d.material_id
            JOIN categories c ON c.id = mat.category_id
            JOIN users u ON u.id = d.user_id
            JOIN members m ON m.user_id = u.id AND m.organization_id = $1
            WHERE c.organization_id = $1
              AND mat.deleted_at IS NULL
              AND u.is_deleted = false
            GROUP BY u.id
          ) grouped_users
          `,
          organizationId,
        ),
      ]);

      const total = Number(countResult[0]?.total ?? 0);

      return {
        data: rows.map((row) => ({
          userId: row.user_id,
          name: row.name,
          email: row.email,
          downloadCount: Number(row.download_count),
        })),
        total,
        totalPages: Math.ceil(total / limit) || 0,
        page,
      };
    } catch (error) {
      void this.logger.error(
        'ReportRepository.findTopUsersByMaterialDownloads falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar relatório de usuários por download',
      );
    }
  }

  async findAllTopUsersByMaterialDownloads(
    organizationId: string,
  ): Promise<TopUserByMaterialDownloadRow[]> {
    const result = await this.findTopUsersByMaterialDownloads(organizationId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });

    return result.data;
  }

  async findTopMaterialsByViews(
    organizationId: string,
    filters: FindReportFiltersDTO = {},
  ): Promise<PaginatedResponse<TopMaterialByViewRow>> {
    const { page, limit, offset } = this.resolvePagination(filters);

    try {
      const [rows, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<
          {
            material_id: string;
            name: string;
            category_name: string;
            view_count: bigint;
          }[]
        >(
          `
          SELECT
            mat.id AS material_id,
            mat.name,
            c.name AS category_name,
            COUNT(v.id)::bigint AS view_count
          FROM material_views v
          JOIN materials mat ON mat.id = v.material_id
          JOIN categories c ON c.id = mat.category_id
          WHERE c.organization_id = $1
            AND mat.deleted_at IS NULL
          GROUP BY mat.id, mat.name, c.name
          ORDER BY view_count DESC, mat.name ASC
          LIMIT $2 OFFSET $3
          `,
          organizationId,
          limit,
          offset,
        ),
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
          `
          SELECT COUNT(*)::bigint AS total
          FROM (
            SELECT mat.id
            FROM material_views v
            JOIN materials mat ON mat.id = v.material_id
            JOIN categories c ON c.id = mat.category_id
            WHERE c.organization_id = $1
              AND mat.deleted_at IS NULL
            GROUP BY mat.id
          ) grouped_materials
          `,
          organizationId,
        ),
      ]);

      const total = Number(countResult[0]?.total ?? 0);

      return {
        data: rows.map((row) => ({
          materialId: row.material_id,
          name: row.name,
          categoryName: row.category_name,
          viewCount: Number(row.view_count),
        })),
        total,
        totalPages: Math.ceil(total / limit) || 0,
        page,
      };
    } catch (error) {
      void this.logger.error(
        'ReportRepository.findTopMaterialsByViews falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar relatório de materiais mais acessados',
      );
    }
  }

  async findAllTopMaterialsByViews(
    organizationId: string,
  ): Promise<TopMaterialByViewRow[]> {
    const result = await this.findTopMaterialsByViews(organizationId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });

    return result.data;
  }

  async findTopMaterialsByDownloads(
    organizationId: string,
    filters: FindReportFiltersDTO = {},
  ): Promise<PaginatedResponse<TopMaterialByDownloadRow>> {
    const { page, limit, offset } = this.resolvePagination(filters);

    try {
      const [rows, countResult] = await Promise.all([
        this.prisma.$queryRawUnsafe<
          {
            material_id: string;
            name: string;
            category_name: string;
            download_count: bigint;
          }[]
        >(
          `
          SELECT
            mat.id AS material_id,
            mat.name,
            c.name AS category_name,
            COUNT(d.id)::bigint AS download_count
          FROM material_downloads d
          JOIN materials mat ON mat.id = d.material_id
          JOIN categories c ON c.id = mat.category_id
          WHERE c.organization_id = $1
            AND mat.deleted_at IS NULL
          GROUP BY mat.id, mat.name, c.name
          ORDER BY download_count DESC, mat.name ASC
          LIMIT $2 OFFSET $3
          `,
          organizationId,
          limit,
          offset,
        ),
        this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
          `
          SELECT COUNT(*)::bigint AS total
          FROM (
            SELECT mat.id
            FROM material_downloads d
            JOIN materials mat ON mat.id = d.material_id
            JOIN categories c ON c.id = mat.category_id
            WHERE c.organization_id = $1
              AND mat.deleted_at IS NULL
            GROUP BY mat.id
          ) grouped_materials
          `,
          organizationId,
        ),
      ]);

      const total = Number(countResult[0]?.total ?? 0);

      return {
        data: rows.map((row) => ({
          materialId: row.material_id,
          name: row.name,
          categoryName: row.category_name,
          downloadCount: Number(row.download_count),
        })),
        total,
        totalPages: Math.ceil(total / limit) || 0,
        page,
      };
    } catch (error) {
      void this.logger.error(
        'ReportRepository.findTopMaterialsByDownloads falhou',
        {
          error: String(error),
          organizationId,
        },
      );

      throw new BadRequestException(
        'Erro ao buscar relatório de materiais por download',
      );
    }
  }

  async findAllTopMaterialsByDownloads(
    organizationId: string,
  ): Promise<TopMaterialByDownloadRow[]> {
    const result = await this.findTopMaterialsByDownloads(organizationId, {
      page: 1,
      limit: Number.MAX_SAFE_INTEGER,
    });

    return result.data;
  }

  private resolvePagination(filters: FindReportFiltersDTO): PaginationParams {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;

    return {
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}
