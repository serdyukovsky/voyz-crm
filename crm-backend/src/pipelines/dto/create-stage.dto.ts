import { IsString, IsInt, IsOptional, IsBoolean, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StageType } from '@prisma/client';

export class CreateStageDto {
  @ApiProperty({ description: 'Stage name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Stage order (position in pipeline)' })
  @IsInt()
  @Min(0)
  order: number;

  @ApiPropertyOptional({ description: 'Stage color (hex code)', default: '#6B7280' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Whether this is a default stage', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Stage type: OPEN, WON, or LOST', enum: StageType, default: 'OPEN' })
  @IsOptional()
  @IsEnum(StageType)
  type?: StageType;
}
