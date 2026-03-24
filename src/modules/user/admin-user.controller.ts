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
    @Query('searchTerm') searchTerm?: string,
    @Query('role') role?: string,
    @Query('platformRoleId') platformRoleId?: string,
    @Query('platformRoleName') platformRoleName?: string,
    @Query('companyId') companyId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('managerId') managerId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return await this.findAllUsersUseCase.execute({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      name,
      email,
      searchTerm,
      role,
      platformRoleId,
      platformRoleName,
      companyId,
      organizationId,
      managerId,
      isActive: isActive ? isActive === 'true' : undefined,
    });
  }

  @Post()
  @RequirePermission('users', 'create')
  async create(@Body() dto: CreateUserDTO, @UserId() userId: string) {
    const user = await this.createUserUseCase.execute(dto, userId);

    delete user.password;

    return user;
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
