import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePipelineDto {
  @ApiProperty({ description: 'Pipeline name', minLength: 1, maxLength: 255 })
  @IsString()
  @MinLength(1, { message: 'Pipeline name must be at least 1 character long' })
  @MaxLength(255, { message: 'Pipeline name must be at most 255 characters long' })
  name: string;

  @ApiPropertyOptional({ description: 'Pipeline description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Pipeline description must be at most 1000 characters long' })
  description?: string;

  @ApiPropertyOptional({ description: 'Whether this is the default pipeline', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}



