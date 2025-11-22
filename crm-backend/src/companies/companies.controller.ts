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
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyFilterDto } from './dto/company-filter.dto';
import { CompanyResponseDto } from './dto/company-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a new company',
    description: 'Create a new company with name, industry, and optional contact information',
  })
  @ApiResponse({
    status: 201,
    description: 'Company created successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 409,
    description: 'Company with this name already exists',
  })
  create(@Body() createCompanyDto: CreateCompanyDto, @CurrentUser() user: any) {
    return this.companiesService.create(createCompanyDto, user.userId || user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get all companies with optional filters',
    description: 'Retrieve a list of companies with optional filtering by search and industry',
  })
  @ApiResponse({
    status: 200,
    description: 'List of companies',
    type: [CompanyResponseDto],
  })
  findAll(@Query() filters: CompanyFilterDto) {
    return this.companiesService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get company by ID',
    description: 'Retrieve detailed information about a specific company including stats, contacts, and deals',
  })
  @ApiResponse({
    status: 200,
    description: 'Company details',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/stats')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({
    summary: 'Get company statistics',
    description: 'Get deal statistics for a company (active deals, closed deals, total deals, total volume)',
  })
  @ApiResponse({
    status: 200,
    description: 'Company statistics',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  getStats(@Param('id') id: string) {
    return this.companiesService.getStats(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({
    summary: 'Update company',
    description: 'Update company information. Only provided fields will be updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'Company updated successfully',
    type: CompanyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Company with this name already exists',
  })
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser() user: any,
  ) {
    return this.companiesService.update(id, updateCompanyDto, user.userId || user.id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete company',
    description: 'Permanently delete a company. This will unlink associated contacts and deals.',
  })
  @ApiResponse({
    status: 200,
    description: 'Company deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Company not found',
  })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.companiesService.remove(id, user.userId || user.id);
  }
}

