import { OrgId, RequirePermission, UserId } from '@common/decorators';
import { PlatformPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreateGlobalUserDTO,
  CreateUserDTO,
  FindAllUsersFiltersDTO,
  UpdateUserDTO,
} from './dto';
import { UserById } from './entities';
import {
  CreateGlobalUserUseCase,
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindGlobalUsersSelectUseCase,
  FindUsersSelectUseCase,
  FindUserByIdUseCase,
  GetMeUseCase,
  UpdateUserUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly createGlobalUserUseCase: CreateGlobalUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findGlobalUsersSelectUseCase: FindGlobalUsersSelectUseCase,
    private readonly findUsersSelectUseCase: FindUsersSelectUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly getMeUseCase: GetMeUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @RequirePermission('users', 'read')
  @Get()
  async getList(
    @Query() filters: FindAllUsersFiltersDTO = {},
    @OrgId() organizationId: string,
  ) {
    return await this.findAllUsersUseCase.execute(filters, organizationId);
  }

  @Get('/me')
  async getMe(@UserId() userId: string) {
    return await this.getMeUseCase.execute(userId);
  }

  @RequirePermission('users', 'read')
  @Get('/global/select')
  async findGlobalUsersSelect(@OrgId() organizationId: string) {
    return await this.findGlobalUsersSelectUseCase.execute(organizationId);
  }

  @RequirePermission('members', 'create')
  @Get('/select')
  async findUsersSelect(@OrgId() organizationId: string) {
    return await this.findUsersSelectUseCase.execute(organizationId);
  }

  @RequirePermission('users', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string): Promise<UserById> {
    const user = await this.findUserByIdUseCase.execute(id);

    delete user.password;

    return user;
  }

  @RequirePermission('users', 'create')
  @Post()
  async create(
    @Body() dto: CreateUserDTO,
    @UserId() userId: string,
    @OrgId() organizationId: string,
  ) {
    await this.createUserUseCase.execute(dto, userId, organizationId);
  }

  @RequirePermission('users', 'create')
  @Post('global')
  async createGlobal(
    @Body() dto: CreateGlobalUserDTO,
    @UserId() userId: string,
  ) {
    await this.createGlobalUserUseCase.execute(dto, userId);
  }

  @RequirePermission('users', 'update')
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
    @UserId() userId: string,
    @OrgId() organizationId: string,
  ) {
    await this.updateUserUseCase.execute(id, dto, userId, organizationId);
  }

  @RequirePermission('users', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    await this.deleteUserUseCase.execute(id);
  }
}
