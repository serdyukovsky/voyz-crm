import { IsEnum, IsOptional, IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkAssignMode {
  IDS = 'IDS',
  FILTER = 'FILTER',
}

export class BulkAssignFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pipelineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class BulkAssignDto {
  @ApiProperty({ enum: BulkAssignMode, description: 'Assign mode: IDS or FILTER' })
  @IsEnum(BulkAssignMode)
  mode: BulkAssignMode;

  @ApiPropertyOptional({
    description: 'Array of deal IDs to update (required for IDS mode)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  @ApiPropertyOptional({
    description: 'Array of deal IDs to exclude from update (for FILTER mode)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter criteria (required for FILTER mode)',
    type: BulkAssignFilterDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BulkAssignFilterDto)
  filter?: BulkAssignFilterDto;

  @ApiPropertyOptional({
    description: 'User ID to assign (null to clear assignment)',
  })
  @IsOptional()
  assignedToId?: string | null;
}

export interface BulkAssignResult {
  updatedCount: number;
  failedCount: number;
  errors?: Array<{ id: string; error: string }>;
}
