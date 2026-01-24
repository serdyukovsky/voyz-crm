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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new contact',
    description: 'Create a new contact with full name, email, phone, and optional company information',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Contact with this email already exists',
  })
  create(@Body() createContactDto: CreateContactDto, @CurrentUser() user: any) {
    return this.contactsService.create(createContactDto, user.userId || user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get all contacts with optional filters',
    description: 'Retrieve a list of contacts with optional filtering by search, company, tags, and deal status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of contacts',
    type: [ContactResponseDto],
  })
  findAll(@Query() filters: ContactFilterDto) {
    return this.contactsService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get contact by ID',
    description: 'Retrieve detailed information about a specific contact including stats, deals, and tasks',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact details',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get contact statistics',
    description: 'Get deal statistics for a contact (active deals, closed deals, total deals, total volume)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact statistics',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  getStats(@Param('id') id: string) {
    return this.contactsService.getStats(id);
  }

  @Get(':id/tasks')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get tasks for a contact',
    description: 'Retrieve all tasks associated with a specific contact',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tasks',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  getTasks(@Param('id') id: string) {
    return this.contactsService.getTasks(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update contact',
    description: 'Update contact information. Only provided fields will be updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Contact with this email already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateContactDto: any,
    @CurrentUser() user: any,
  ) {
    console.log('[ContactsController.update] Received:', {
      contactId: id,
      dealId: updateContactDto?.dealId,
      fields: Object.keys(updateContactDto),
    });
    return this.contactsService.update(id, updateContactDto, user.userId || user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete contact',
    description: 'Permanently delete a contact. This will not delete associated deals or tasks, but will unlink them.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Contact not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.contactsService.remove(id, user.userId || user.id);
  }
}

