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
import { PaginatedResponse } from '../../types';
import {
  CreateMemberDTO,
  CreateMemberWithUserDTO,
  FindAllMembersFiltersDTO,
  UpdateMemberDTO,
} from './dto';
import { Member, MemberList, ImportantDateItem } from './entities';
import {
  AddUserMemberUseCase,
  CreateMemberWithUserUseCase,
  DeleteMemberUseCase,
  FindAllMembersUseCase,
  FindMemberByIdUseCase,
  FindMemberRoleDetailsUseCase,
  FindMemberRoleUseCase,
  ListImportantDatesUseCase,
  UpdateMemberUseCase,
} from './use-cases';

@UseGuards(PlatformPermissionGuard)
@Controller('members')
export class MemberController {
  constructor(
    private readonly addUserMemberUseCase: AddUserMemberUseCase,
    private readonly createMemberWithUserUseCase: CreateMemberWithUserUseCase,
    private readonly findAllMembersUseCase: FindAllMembersUseCase,
    private readonly findMemberByIdUseCase: FindMemberByIdUseCase,
    private readonly findMemberRoleDetailsUseCase: FindMemberRoleDetailsUseCase,
    private readonly findMemberRoleUseCase: FindMemberRoleUseCase,
    private readonly updateMemberUseCase: UpdateMemberUseCase,
    private readonly deleteMemberUseCase: DeleteMemberUseCase,
    private readonly listImportantDatesUseCase: ListImportantDatesUseCase,
  ) {}

  @RequirePermission('members', 'read')
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllMembersFiltersDTO = {},
  ): Promise<PaginatedResponse<MemberList>> {
    return await this.findAllMembersUseCase.execute(organizationId, filters);
  }

  @Get('me')
  async findMyRole(@OrgId() organizationId: string, @UserId() userId: string) {
    return await this.findMemberRoleUseCase.execute(organizationId, userId);
  }

  @Get('role')
  async findMemberRoleDetails(
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.findMemberRoleDetailsUseCase.execute(
      organizationId,
      userId,
    );
  }

  @Get('important-dates')
  async listImportantDates(
    @OrgId() organizationId: string,
  ): Promise<ImportantDateItem[]> {
    return await this.listImportantDatesUseCase.execute(organizationId);
  }

  @RequirePermission('members', 'read')
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @OrgId() organizationId: string,
  ): Promise<Member> {
    return await this.findMemberByIdUseCase.execute(id, organizationId);
  }

  @RequirePermission('members', 'create')
  @Post('new')
  async createNew(
    @Body() dto: CreateMemberWithUserDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.createMemberWithUserUseCase.execute(
      organizationId,
      dto,
      userId,
    );
  }

  @RequirePermission('members', 'create')
  @Post('add')
  async add(
    @Body() dto: CreateMemberDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.addUserMemberUseCase.execute(organizationId, dto, userId);
  }

  @RequirePermission('members', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.updateMemberUseCase.execute(
      id,
      organizationId,
      dto,
      userId,
    );
  }

  @RequirePermission('members', 'delete')
  @Delete(':id')
  async delete(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.deleteMemberUseCase.execute(id, organizationId);
  }
}
