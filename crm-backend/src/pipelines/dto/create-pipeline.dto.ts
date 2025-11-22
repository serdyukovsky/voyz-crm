import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePipelineDto {
  @ApiProperty({ description: 'Pipeline name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Pipeline description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default pipeline', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

