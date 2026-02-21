import { Controller, Get, Post, Delete, Query, Body, UseGuards } from '@nestjs/common';
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

  @Post('add')
  @ApiOperation({ summary: 'Добавить новую опцию в системное поле' })
  @ApiQuery({ name: 'entityType', enum: ['deal', 'contact'], required: true })
  @ApiQuery({ name: 'fieldName', type: String, required: true })
  async addOption(
    @Query('entityType') entityType: 'deal' | 'contact',
    @Query('fieldName') fieldName: string,
    @Body() body: { option: string },
  ) {
    const options = await this.systemFieldOptionsService.addOptionsIfMissing(
      entityType,
      fieldName,
      [body.option],
    );
    return { options };
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Удалить опцию из системного поля' })
  @ApiQuery({ name: 'entityType', enum: ['deal', 'contact'], required: true })
  @ApiQuery({ name: 'fieldName', type: String, required: true })
  async removeOption(
    @Query('entityType') entityType: 'deal' | 'contact',
    @Query('fieldName') fieldName: string,
    @Body() body: { option: string },
  ) {
    const options = await this.systemFieldOptionsService.removeOption(
      entityType,
      fieldName,
      body.option,
    );
    return { options };
  }
}
