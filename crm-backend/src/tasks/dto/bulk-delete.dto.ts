import { IsEnum, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export enum BulkDeleteMode {
  IDS = 'IDS',
  FILTER = 'FILTER',
}

export class BulkDeleteFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: TaskStatus })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;
}

export class BulkDeleteDto {
  @ApiProperty({ enum: BulkDeleteMode, description: 'Delete mode: IDS or FILTER' })
  @IsEnum(BulkDeleteMode)
  mode: BulkDeleteMode;

  @ApiPropertyOptional({ 
    description: 'Array of task IDs to delete (required for IDS mode)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @ApiPropertyOptional({ 
    description: 'Array of task IDs to exclude from deletion (for FILTER mode)',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedIds?: string[];

  @ApiPropertyOptional({ 
    description: 'Filter criteria (required for FILTER mode)',
    type: BulkDeleteFilterDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkDeleteFilterDto)
  filter?: BulkDeleteFilterDto;
}

export interface BulkDeleteResult {
  deletedCount: number;
  failedCount: number;
  errors?: Array<{ id: string; error: string }>;
}
