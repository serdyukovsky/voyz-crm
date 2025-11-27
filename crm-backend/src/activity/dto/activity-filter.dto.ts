import { IsEnum, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '@prisma/client';
import { Type } from 'class-transformer';

export class ActivityFilterDto {
  @ApiPropertyOptional({ 
    description: 'Entity type: deal, contact, company, or task',
    enum: ['deal', 'contact', 'company', 'task']
  })
  @IsOptional()
  @IsString()
  entityType?: 'deal' | 'contact' | 'company' | 'task';

  @ApiPropertyOptional({ description: 'Entity ID' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ 
    description: 'Activity type filter',
    enum: ActivityType
  })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional({ description: 'Filter activities after this date (ISO string)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter activities before this date (ISO string)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}





