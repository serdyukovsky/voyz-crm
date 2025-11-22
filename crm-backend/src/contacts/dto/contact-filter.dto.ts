import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ContactFilterDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Filter by tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ description: 'Filter contacts with active deals' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasActiveDeals?: boolean;

  @ApiPropertyOptional({ description: 'Filter contacts with closed deals' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasClosedDeals?: boolean;
}

