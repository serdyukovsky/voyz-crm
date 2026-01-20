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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  async create(@Body() createDealDto: any, @CurrentUser() user: any) {
    try {
      const result = await this.dealsService.create(createDealDto, user.userId || user.id);
      return result;
    } catch (error) {
      console.error('DealsController.create - error:', error);
      console.error('DealsController.create - error stack:', error instanceof Error ? error.stack : 'No stack');
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
    @Query('assignedToId') assignedToId?: string,
    @Query('contactId') contactId?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    // For kanban boards, allow larger limits (up to 10000)
    // For regular lists, limit to 100 for performance
    const requestedLimit = limit ? parseInt(limit, 10) : 50;
    const limitNum = requestedLimit > 1000 ? Math.min(requestedLimit, 10000) : Math.min(requestedLimit, 100);
    return this.dealsService.findAll({
      pipelineId,
      stageId,
      assignedToId,
      contactId,
      companyId,
      search,
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
    @Query('assignedToId') assignedToId?: string,
    @Query('contactId') contactId?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.dealsService.count({
      pipelineId,
      stageId,
      assignedToId,
      contactId,
      companyId,
      search,
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

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete deal' })
  @ApiResponse({ status: 200, description: 'Deal deleted' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.dealsService.remove(id, user.userId || user.id);
  }
}

