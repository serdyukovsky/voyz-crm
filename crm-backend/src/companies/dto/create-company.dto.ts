import { IsString, IsOptional, IsObject, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsPhone } from '@/common/decorators/is-phone.decorator';
import { IsEmailNormalized } from '@/common/decorators/is-email-normalized.decorator';

class SocialLinksDto {
  @ApiPropertyOptional({ description: 'Instagram username or URL' })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional({ description: 'Telegram username or URL' })
  @IsOptional()
  @IsString()
  telegram?: string;

  @ApiPropertyOptional({ description: 'WhatsApp phone number or URL' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'VK username or URL' })
  @IsOptional()
  @IsString()
  vk?: string;

  @ApiPropertyOptional({ description: 'LinkedIn username or URL' })
  @IsOptional()
  @IsString()
  linkedin?: string;
}

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ description: 'Email address (will be normalized to lowercase)' })
  @IsOptional()
  @IsEmailNormalized()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number (will be normalized to E.164 format)' })
  @IsOptional()
  @IsPhone('RU')
  phone?: string;

  @ApiPropertyOptional({ type: SocialLinksDto, description: 'Social media links (supports username-only or full URLs)' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  social?: SocialLinksDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  employees?: number;
}

