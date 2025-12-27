import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SystemFieldOptionsService } from './system-field-options.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@ApiTags('System Field Options')
@Controller('system-field-options')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemFieldOptionsController {
  constructor(private readonly systemFieldOptionsService: SystemFieldOptionsService) {}

  @Get()
  @ApiOperation({ summary: 'Получение опций для системного поля' })
  @ApiQuery({ name: 'entityType', enum: ['deal', 'contact'], required: true })
  @ApiQuery({ name: 'fieldName', type: String, required: true })
  async getOptions(
    @Query('entityType') entityType: 'deal' | 'contact',
    @Query('fieldName') fieldName: string,
  ) {
    const options = await this.systemFieldOptionsService.getOptions(entityType, fieldName);
    return { options };
  }
}

