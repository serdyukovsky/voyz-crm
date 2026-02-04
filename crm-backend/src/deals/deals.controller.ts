import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { BulkAssignDto } from './dto/bulk-assign.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Deals')
@Controller('deals')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  private parseList(value?: string | string[]): string[] | undefined {
    if (!value) return undefined;
    const items = Array.isArray(value) ? value : value.split(',');
    const normalized = items.map(item => item.trim()).filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  }

  private parseNumber(value?: string): number | undefined {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async create(@Body() createDealDto: any, @CurrentUser() user: any) {
    console.log('🔵 DealsController.create - request:', {
      pipelineId: createDealDto?.pipelineId,
      stageId: createDealDto?.stageId,
      title: createDealDto?.title,
      amount: createDealDto?.amount,
      userId: user?.userId || user?.id,
    });
    
    try {
      const result = await this.dealsService.create(createDealDto, user.userId || user.id);
      console.log('✅ DealsController.create - success, deal id:', result?.id);
      return result;
    } catch (error) {
      console.error('❌ DealsController.create - error:', error);
      throw error;
    }
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all deals with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'List of deals (array if no cursor, paginated response if cursor provided)' })
  findAll(
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('stageIds') stageIds?: string | string[],
    @Query('assignedToId') assignedToId?: string,
    @Query('contactId') contactId?: string,
    @Query('companyId') companyId?: string,
    @Query('createdById') createdById?: string,
    @Query('search') search?: string,
    @Query('title') title?: string,
    @Query('number') number?: string,
    @Query('description') description?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
    @Query('budgetMin') budgetMin?: string,
    @Query('budgetMax') budgetMax?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dateType') dateType?: 'created' | 'closed' | 'expectedClose',
    @Query('expectedCloseFrom') expectedCloseFrom?: string,
    @Query('expectedCloseTo') expectedCloseTo?: string,
    @Query('tags') tags?: string | string[],
    @Query('rejectionReasons') rejectionReasons?: string | string[],
    @Query('activeStagesOnly') activeStagesOnly?: string,
    @Query('contactSubscriberCountMin') contactSubscriberCountMin?: string,
    @Query('contactSubscriberCountMax') contactSubscriberCountMax?: string,
    @Query('contactDirections') contactDirections?: string | string[],
    @Query('taskStatuses') taskStatuses?: string | string[],
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // Allow up to 10000 deals per request for kanban boards
    // Default limit is 50 if not specified
    const requestedLimit = limit ? parseInt(limit, 10) : 50;
    const limitNum = Math.min(requestedLimit, 10000);
    const parsedStageIds = this.parseList(stageIds);
    const combinedStageIds = stageId ? [stageId, ...(parsedStageIds || [])] : parsedStageIds;

    // Debug logging for taskStatuses
    if (taskStatuses) {
      console.log('🔵 Controller received taskStatuses param:', taskStatuses, 'type:', typeof taskStatuses);
      console.log('🔵 Parsed taskStatuses:', this.parseList(taskStatuses));
    }

    return this.dealsService.findAll({
      pipelineId,
      stageIds: combinedStageIds,
      assignedToId,
      contactId,
      companyId,
      createdById,
      search,
      title,
      number,
      description,
      amountMin: this.parseNumber(amountMin),
      amountMax: this.parseNumber(amountMax),
      budgetMin: this.parseNumber(budgetMin),
      budgetMax: this.parseNumber(budgetMax),
      dateFrom,
      dateTo,
      dateType,
      expectedCloseFrom,
      expectedCloseTo,
      tags: this.parseList(tags),
      rejectionReasons: this.parseList(rejectionReasons),
      activeStagesOnly: activeStagesOnly === 'true',
      contactSubscriberCountMin: this.parseNumber(contactSubscriberCountMin),
      contactSubscriberCountMax: this.parseNumber(contactSubscriberCountMax),
      contactDirections: this.parseList(contactDirections),
      taskStatuses: this.parseList(taskStatuses),
      limit: limitNum,
      cursor,
    });
  }

  @Get('count')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Count deals matching filters' })
  @ApiResponse({ status: 200, description: 'Count of deals' })
  count(
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('stageIds') stageIds?: string | string[],
    @Query('assignedToId') assignedToId?: string,
    @Query('contactId') contactId?: string,
    @Query('companyId') companyId?: string,
    @Query('createdById') createdById?: string,
    @Query('search') search?: string,
    @Query('title') title?: string,
    @Query('number') number?: string,
    @Query('description') description?: string,
    @Query('amountMin') amountMin?: string,
    @Query('amountMax') amountMax?: string,
    @Query('budgetMin') budgetMin?: string,
    @Query('budgetMax') budgetMax?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('dateType') dateType?: 'created' | 'closed' | 'expectedClose',
    @Query('expectedCloseFrom') expectedCloseFrom?: string,
    @Query('expectedCloseTo') expectedCloseTo?: string,
    @Query('tags') tags?: string | string[],
    @Query('rejectionReasons') rejectionReasons?: string | string[],
    @Query('activeStagesOnly') activeStagesOnly?: string,
    @Query('contactSubscriberCountMin') contactSubscriberCountMin?: string,
    @Query('contactSubscriberCountMax') contactSubscriberCountMax?: string,
    @Query('contactDirections') contactDirections?: string | string[],
  ) {
    const parsedStageIds = this.parseList(stageIds);
    const combinedStageIds = stageId ? [stageId, ...(parsedStageIds || [])] : parsedStageIds;

    return this.dealsService.count({
      pipelineId,
      stageIds: combinedStageIds,
      assignedToId,
      contactId,
      companyId,
      createdById,
      search,
      title,
      number,
      description,
      amountMin: this.parseNumber(amountMin),
      amountMax: this.parseNumber(amountMax),
      budgetMin: this.parseNumber(budgetMin),
      budgetMax: this.parseNumber(budgetMax),
      dateFrom,
      dateTo,
      dateType,
      expectedCloseFrom,
      expectedCloseTo,
      tags: this.parseList(tags),
      rejectionReasons: this.parseList(rejectionReasons),
      activeStagesOnly: activeStagesOnly === 'true',
      contactSubscriberCountMin: this.parseNumber(contactSubscriberCountMin),
      contactSubscriberCountMax: this.parseNumber(contactSubscriberCountMax),
      contactDirections: this.parseList(contactDirections),
    }).then(count => ({ count }));
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get deal by ID' })
  @ApiResponse({ status: 200, description: 'Deal details' })
  @ApiResponse({ status: 404, description: 'Deal not found' })
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Post(':id/link-contact')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Link contact to deal' })
  @ApiResponse({ status: 200, description: 'Contact linked' })
  linkContact(
    @Param('id') dealId: string,
    @Body() body: { contactId: string },
    @CurrentUser() user: any,
  ) {
    return this.dealsService.linkContact(dealId, body.contactId, user.userId || user.id);
  }

  @Post(':id/unlink-contact')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Unlink contact from deal' })
  @ApiResponse({ status: 200, description: 'Contact unlinked' })
  unlinkContact(@Param('id') dealId: string, @CurrentUser() user: any) {
    return this.dealsService.unlinkContact(dealId, user.userId || user.id);
  }

  @Delete('bulk')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk delete deals by IDs or filters' })
  @ApiResponse({ status: 200, description: 'Bulk delete result' })
  bulkDelete(@Body() dto: BulkDeleteDto, @CurrentUser() user: any) {
    return this.dealsService.bulkDelete(dto, user.userId || user.id);
  }

  @Patch('bulk-assignee')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk update deal assignee by IDs or filters' })
  @ApiResponse({ status: 200, description: 'Bulk assign result' })
  bulkAssign(@Body() dto: BulkAssignDto, @CurrentUser() user: any) {
    return this.dealsService.bulkAssign(dto, user.userId || user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update deal' })
  @ApiResponse({ status: 200, description: 'Deal updated' })
  update(
    @Param('id') id: string,
    @Body() updateDealDto: any,
    @CurrentUser() user: any,
  ) {
    return this.dealsService.update(id, updateDealDto, user.userId || user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete deal' })
  @ApiResponse({ status: 200, description: 'Deal deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dealsService.remove(id, user.userId || user.id);
  }
}

