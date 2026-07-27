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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateEventDTO, FindAllEventsFiltersDTO, UpdateEventDTO } from './dto';
import {
  CreateEventUseCase,
  DeleteEventUseCase,
  FindAllEventsUseCase,
  FindEventByIdUseCase,
  UpdateEventUseCase,
} from './use-cases';

@ApiTags('calendar-events')
@Controller('calendar/events')
export class EventController {
  constructor(
    private readonly createEventUseCase: CreateEventUseCase,
    private readonly findAllEventsUseCase: FindAllEventsUseCase,
    private readonly findEventByIdUseCase: FindEventByIdUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly deleteEventUseCase: DeleteEventUseCase,
  ) {}

  @ApiOperation({ summary: 'Lista eventos visíveis para o usuário' })
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @UserId() userId: string,
    @Query() filters: FindAllEventsFiltersDTO = {},
  ) {
    return await this.findAllEventsUseCase.execute(
      organizationId,
      userId,
      filters,
    );
  }

  @ApiOperation({ summary: 'Detalhe de um evento' })
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.findEventByIdUseCase.execute(id, organizationId, userId);
  }

  @ApiOperation({ summary: 'Cria evento' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'create')
  @Post()
  async create(
    @Body() dto: CreateEventDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.createEventUseCase.execute(organizationId, dto, userId);
  }

  @ApiOperation({ summary: 'Atualiza evento' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.updateEventUseCase.execute(id, organizationId, dto, userId);
  }

  @ApiOperation({ summary: 'Remove evento (soft delete)' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteEventUseCase.execute(id, organizationId, userId);
  }
}
