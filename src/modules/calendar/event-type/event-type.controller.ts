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
import {
  CreateEventTypeDTO,
  FindAllEventTypesFiltersDTO,
  UpdateEventTypeDTO,
} from './dto';
import {
  CreateEventTypeUseCase,
  DeleteEventTypeUseCase,
  FindAllEventTypesUseCase,
  FindEventTypeByIdUseCase,
  UpdateEventTypeUseCase,
} from './use-cases';

@ApiTags('calendar-event-types')
@Controller('calendar/event-types')
export class EventTypeController {
  constructor(
    private readonly createEventTypeUseCase: CreateEventTypeUseCase,
    private readonly findAllEventTypesUseCase: FindAllEventTypesUseCase,
    private readonly findEventTypeByIdUseCase: FindEventTypeByIdUseCase,
    private readonly updateEventTypeUseCase: UpdateEventTypeUseCase,
    private readonly deleteEventTypeUseCase: DeleteEventTypeUseCase,
  ) {}

  @ApiOperation({ summary: 'Lista tipos de evento da organização' })
  @Get()
  async findAll(
    @OrgId() organizationId: string,
    @Query() filters: FindAllEventTypesFiltersDTO = {},
  ) {
    return await this.findAllEventTypesUseCase.execute(organizationId, filters);
  }

  @ApiOperation({ summary: 'Detalhe de um tipo de evento' })
  @Get(':id')
  async findById(@Param('id') id: string, @OrgId() organizationId: string) {
    return await this.findEventTypeByIdUseCase.execute(id, organizationId);
  }

  @ApiOperation({ summary: 'Cria tipo de evento' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'create')
  @Post()
  async create(
    @Body() dto: CreateEventTypeDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    return await this.createEventTypeUseCase.execute(
      organizationId,
      dto,
      userId,
    );
  }

  @ApiOperation({ summary: 'Atualiza tipo de evento' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventTypeDTO,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.updateEventTypeUseCase.execute(id, organizationId, dto, userId);
  }

  @ApiOperation({ summary: 'Remove tipo de evento (soft delete)' })
  @UseGuards(PlatformPermissionGuard)
  @RequirePermission('calendar', 'delete')
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @OrgId() organizationId: string,
    @UserId() userId: string,
  ) {
    await this.deleteEventTypeUseCase.execute(id, organizationId, userId);
  }
}
