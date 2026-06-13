import { OrgId, RequirePermission, UserId } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FindReportFiltersDTO } from './dto';
import { ReportType } from './entities';
import {
  EnqueueReportExportUseCase,
  FindTopMaterialsByDownloadsUseCase,
  FindTopMaterialsByViewsUseCase,
  FindTopUsersByMaterialDownloadsUseCase,
  FindTopUsersByPlatformLoginsUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly findTopUsersByPlatformLoginsUseCase: FindTopUsersByPlatformLoginsUseCase,
    private readonly findTopUsersByMaterialDownloadsUseCase: FindTopUsersByMaterialDownloadsUseCase,
    private readonly findTopMaterialsByViewsUseCase: FindTopMaterialsByViewsUseCase,
    private readonly findTopMaterialsByDownloadsUseCase: FindTopMaterialsByDownloadsUseCase,
    private readonly enqueueReportExportUseCase: EnqueueReportExportUseCase,
  ) {}

  @RequirePermission('reports', 'read')
  @Get('users/top-logins')
  async findTopUsersByPlatformLogins(
    @OrgId() organizationId: string,
    @Query() filters: FindReportFiltersDTO = {},
  ) {
    return await this.findTopUsersByPlatformLoginsUseCase.execute(
      organizationId,
      filters,
    );
  }

  @RequirePermission('reports', 'read')
  @Get('users/top-logins/export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportTopUsersByPlatformLogins(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.enqueueReportExportUseCase.execute(
      ReportType.USERS_TOP_LOGINS,
      organizationId,
      userId,
    );

    return {
      message:
        'Relatório enfileirado. Você receberá o CSV por e-mail em breve.',
    };
  }

  @RequirePermission('reports', 'read')
  @Get('users/top-downloads')
  async findTopUsersByMaterialDownloads(
    @OrgId() organizationId: string,
    @Query() filters: FindReportFiltersDTO = {},
  ) {
    return await this.findTopUsersByMaterialDownloadsUseCase.execute(
      organizationId,
      filters,
    );
  }

  @RequirePermission('reports', 'read')
  @Get('users/top-downloads/export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportTopUsersByMaterialDownloads(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.enqueueReportExportUseCase.execute(
      ReportType.USERS_TOP_DOWNLOADS,
      organizationId,
      userId,
    );

    return {
      message:
        'Relatório enfileirado. Você receberá o CSV por e-mail em breve.',
    };
  }

  @RequirePermission('reports', 'read')
  @Get('materials/top-views')
  async findTopMaterialsByViews(
    @OrgId() organizationId: string,
    @Query() filters: FindReportFiltersDTO = {},
  ) {
    return await this.findTopMaterialsByViewsUseCase.execute(
      organizationId,
      filters,
    );
  }

  @RequirePermission('reports', 'read')
  @Get('materials/top-views/export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportTopMaterialsByViews(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.enqueueReportExportUseCase.execute(
      ReportType.MATERIALS_TOP_VIEWS,
      organizationId,
      userId,
    );

    return {
      message:
        'Relatório enfileirado. Você receberá o CSV por e-mail em breve.',
    };
  }

  @RequirePermission('reports', 'read')
  @Get('materials/top-downloads')
  async findTopMaterialsByDownloads(
    @OrgId() organizationId: string,
    @Query() filters: FindReportFiltersDTO = {},
  ) {
    return await this.findTopMaterialsByDownloadsUseCase.execute(
      organizationId,
      filters,
    );
  }

  @RequirePermission('reports', 'read')
  @Get('materials/top-downloads/export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportTopMaterialsByDownloads(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.enqueueReportExportUseCase.execute(
      ReportType.MATERIALS_TOP_DOWNLOADS,
      organizationId,
      userId,
    );

    return {
      message:
        'Relatório enfileirado. Você receberá o CSV por e-mail em breve.',
    };
  }
}
