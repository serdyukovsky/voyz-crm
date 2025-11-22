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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
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
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new deal' })
  @ApiResponse({ status: 201, description: 'Deal created' })
  create(@Body() createDealDto: any, @CurrentUser() user: any) {
    return this.dealsService.create(createDealDto, user.userId || user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all deals with optional filters' })
  @ApiResponse({ status: 200, description: 'List of deals' })
  findAll(
    @Query('pipelineId') pipelineId?: string,
    @Query('stageId') stageId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('contactId') contactId?: string,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
  ) {
    return this.dealsService.findAll({
      pipelineId,
      stageId,
      assignedToId,
      contactId,
      companyId,
      search,
    });
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

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete deal' })
  @ApiResponse({ status: 200, description: 'Deal deleted' })
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}

