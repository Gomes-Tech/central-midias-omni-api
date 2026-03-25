import { RequirePermission, UserId } from '@common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateUserDTO, UpdateUserDTO } from './dto';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  FindAllUsersUseCase,
  FindUserByIdUseCase,
  UpdateUserUseCase,
} from './use-cases';

@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly findAllUsersUseCase: FindAllUsersUseCase,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
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

  @RequirePermission('users', 'read')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    const user = await this.findUserByIdUseCase.execute(id);

    delete user.password;

    return user;
  }

  @Get('/me')
  async getMe(@UserId() userId: string) {
    const user = await this.findUserByIdUseCase.execute(userId);

    delete user.password;

    return user;
  }

  @RequirePermission('users', 'create')
  @Post()
  async create(@Body() dto: CreateUserDTO, @UserId() userId: string) {
    await this.createUserUseCase.execute(dto, userId);
  }

  @RequirePermission('users', 'update')
  @Patch('/:id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDTO,
    @UserId() userId: string,
  ) {
    await this.updateUserUseCase.execute(id, dto, userId);
  }

  @RequirePermission('users', 'delete')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    await this.deleteUserUseCase.execute(id);
  }
}
