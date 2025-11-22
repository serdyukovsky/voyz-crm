import { IsString, IsInt, IsOptional, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Whether this is a closed stage (won/lost)', default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

