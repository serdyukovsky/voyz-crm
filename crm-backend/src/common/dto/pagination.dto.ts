import { IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Maximum number of items to return (1-100)',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiPropertyOptional({ 
    description: 'Cursor for pagination (base64 encoded JSON: {updatedAt: string, id: string})',
    example: 'eyJ1cGRhdGVkQXQiOiIyMDI0LTAxLTAxVDAwOjAwOjAwWiIsImlkIjoiZGVhbC1pZCJ9'
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface PaginationCursor {
  updatedAt: string; // ISO date string
  id: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total?: number; // Total count of items matching the filter (optional for performance)
}

