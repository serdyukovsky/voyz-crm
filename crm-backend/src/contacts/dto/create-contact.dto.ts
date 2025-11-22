import { IsString, IsOptional, IsArray, ValidateNested, IsObject } from 'class-validator';
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
}

export class CreateContactDto {
  @ApiProperty({ description: 'Full name of the contact' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ description: 'Email address (will be normalized to lowercase)' })
  @IsOptional()
  @IsEmailNormalized()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number (will be normalized to E.164 format)' })
  @IsOptional()
  @IsPhone('RU')
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: SocialLinksDto, description: 'Social media links (supports username-only or full URLs)' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  social?: SocialLinksDto;
}

