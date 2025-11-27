import { PartialType } from '@nestjs/swagger';
import { CreatePipelineDto } from './create-pipeline.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePipelineDto extends PartialType(CreatePipelineDto) {
  @ApiPropertyOptional({ description: 'Whether the pipeline is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}





