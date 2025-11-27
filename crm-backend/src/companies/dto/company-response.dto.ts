import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyStatsDto {
  @ApiProperty()
  totalDeals: number;

  @ApiProperty()
  activeDeals: number;

  @ApiProperty()
  closedDeals: number;

  @ApiProperty()
  totalDealVolume: number;
}

export class CompanyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  industry?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  social?: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    vk?: string;
    linkedin?: string;
  };

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  employees?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: CompanyStatsDto })
  stats: CompanyStatsDto;
}





