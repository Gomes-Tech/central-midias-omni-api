import { Roles, UserId } from '@common/decorators';
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
import { UserRole } from 'types/role';
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

  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateUserDTO, @UserId() userId: string) {
    const user = await this.createUserUseCase.execute(dto, userId);

    delete user.password;

    return user;
  }

  @Roles('ADMIN')
  @Get()
  async getList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('name') name?: string,
    @Query('email') email?: string,
    @Query('role') role?: UserRole,
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

  @Roles('ADMIN')
  @Get('/:id')
  async findById(@Param('id') id: string) {
    const user = await this.findUserByIdUseCase.execute(id);

    delete user.password;

    return user;
  }

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

  @Roles('ADMIN')
  @Delete('/:id')
  async delete(@Param('id') id: string) {
    return await this.deleteUserUseCase.execute(id);
  }
}
