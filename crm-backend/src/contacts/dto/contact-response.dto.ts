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

  @ApiPropertyOptional({ description: 'Ссылка' })
  link?: string;

  @ApiPropertyOptional({ description: 'Кол-во подписчиков' })
  subscriberCount?: string;

  @ApiPropertyOptional({ type: [String], description: 'Направление (множественный выбор)' })
  directions?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Способ связи: Whatsapp, Telegram, Direct' })
  contactMethods?: string[];

  @ApiPropertyOptional({ description: 'Сайт, тг канал' })
  websiteOrTgChannel?: string;

  @ApiPropertyOptional({ description: 'Контакт (номер телефона или никнейм в телеграме)' })
  contactInfo?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: ContactStatsDto })
  stats: ContactStatsDto;
}






