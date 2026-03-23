import { RequirePermission, UserId } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CreateUserDTO } from './dto';
import { CreateUserUseCase, FindAllUsersUseCase } from './use-cases';

@Controller('admin/users')
@UseGuards(PlatformPermissionGuard)
export class AdminUsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
  ) {}

  @RequirePermission('users', 'read')
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
    @Query('companyId') companyId?: string,
    @Query('isActive') isActive?: string,
    @Query('isEmployee') isEmployee?: string,
  ) {
    return await this.findAllUsersUseCase.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      name,
      email,
      role,
      companyId,
      isActive: isActive ? isActive === 'true' : undefined,
      isEmployee: isEmployee ? isEmployee === 'true' : undefined,
    });
  }

  @Post()
  @RequirePermission('users', 'create')
  create(@Body() dto: CreateUserDTO, @UserId() userId: string) {
    return this.createUserUseCase.execute(dto, userId);
  }

  // Troca a role de um usuário do backoffice
  // @Put(':userId/platform-role')
  // @RequirePermission('users', 'update')
  // assignPlatformRole(
  //   @Param('userId') userId: string,
  //   @Body() dto: AssignPlatformRoleDto,
  // ) {
  //   return this.service.assignPlatformRole(userId, dto.platformRoleId);
  // }
}
