import { RequirePermission, UserId } from '@common/decorators';
import { TenantAccessGuard, TenantPermissionGuard } from '@common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateUserDTO, UpdateUserDTO } from './dto';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllTechniciansUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
} from './use-cases';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findAllTechniciansUseCase: FindAllTechniciansUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('users', 'create')
  @Post()
  async create(@Body() dto: CreateUserDTO, @UserId() userId: string) {
    const user = await this.createUserUseCase.execute(dto, userId);

    delete user.password;

    return user;
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @UseGuards(TenantAccessGuard)
  @Get('/me')
  async getMe(@UserId() userId: string) {
    const user = await this.findUserByIdUseCase.execute(userId);

    delete user.password;

    return user;
  }

  @Get('/technicians')
  async findAllTechnicians() {
    return await this.findAllTechniciansUseCase.execute();
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('users', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    const user = await this.findUserByIdUseCase.execute(id);

    delete user.password;

    return user;
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('users', 'update')
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
    @UserId() userId: string,
  ) {
    const user = await this.updateUserUseCase.execute(id, dto, userId);

    delete user.password;

    return user;
  }

  @UseGuards(TenantAccessGuard, TenantPermissionGuard)
  @RequirePermission('users', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteUserUseCase.execute(id);
  }
}
