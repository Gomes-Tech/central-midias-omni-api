import { RequirePermission } from '@common/decorators';
import { AuthGuard, PermissionsGuard } from '@common/guards';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AssignUserRoleDTO, ReplaceUserRolesDTO } from './dto';
import {
  AssignUserRoleUseCase,
  FindUserRolesUseCase,
  ReplaceUserRolesUseCase,
} from './use-cases';

@Controller('user-roles')
export class UserRolesController {
  constructor(
    private readonly assignUserRoleUseCase: AssignUserRoleUseCase,
    private readonly replaceUserRolesUseCase: ReplaceUserRolesUseCase,
    private readonly findUserRolesUseCase: FindUserRolesUseCase,
  ) {}

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('user-roles', 'read')
  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.findUserRolesUseCase.execute(userId);
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('user-roles', 'create')
  @Post()
  async assign(@Body() dto: AssignUserRoleDTO) {
    return this.assignUserRoleUseCase.execute(
      dto.userId,
      dto.roleId,
      dto.companyId,
    );
  }

  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermission('user-roles', 'update')
  @Put('user/:userId')
  async replace(
    @Param('userId') userId: string,
    @Body() dto: ReplaceUserRolesDTO,
  ) {
    return this.replaceUserRolesUseCase.execute(
      userId,
      dto.roles,
      dto.companyIds ?? [],
    );
  }
}
