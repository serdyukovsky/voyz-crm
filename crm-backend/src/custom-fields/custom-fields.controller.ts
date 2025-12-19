import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('Custom Fields')
@Controller('custom-fields')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Создание кастомного поля' })
  async create(@Body() dto: CreateCustomFieldDto) {
    // Generate key from name if not provided
    const key = dto.key || `custom_${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Transform options array to JSON format for Prisma
    const options = dto.options ? { options: dto.options } : undefined;

    return this.customFieldsService.create({
      name: dto.name,
      key,
      type: dto.type,
      entityType: dto.entityType,
      group: dto.group || 'custom',
      isRequired: dto.isRequired || false,
      options,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Получение кастомных полей по типу сущности' })
  async findByEntity(@Query('entityType') entityType: string) {
    return this.customFieldsService.findByEntity(entityType);
  }
}

