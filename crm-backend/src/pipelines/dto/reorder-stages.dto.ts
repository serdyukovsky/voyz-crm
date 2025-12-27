import { IsArray, ValidateNested, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStageItemDto {
  @ApiProperty({ description: 'Stage ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'New order position' })
  @IsInt()
  @Min(0)
  order: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [ReorderStageItemDto], description: 'Array of stage IDs with their new order positions' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderStageItemDto)
  stageOrders: ReorderStageItemDto[];
}

