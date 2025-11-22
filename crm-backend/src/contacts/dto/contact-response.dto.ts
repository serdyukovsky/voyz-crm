import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContactStatsDto {
  @ApiProperty()
  activeDeals: number;

  @ApiProperty()
  closedDeals: number;

  @ApiProperty()
  totalDeals: number;

  @ApiPropertyOptional()
  totalDealVolume?: number;
}

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  fullName: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  position?: string;

  @ApiPropertyOptional()
  companyName?: string;

  @ApiPropertyOptional({ type: [String] })
  tags: string[];

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  social?: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    vk?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: ContactStatsDto })
  stats: ContactStatsDto;
}

