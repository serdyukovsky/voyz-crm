import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendEmailDto {
  @ApiProperty({ example: 'recipient@example.com', description: 'Recipient email address' })
  @IsEmail()
  @IsString()
  to: string;

  @ApiProperty({ example: 'Subject of the email', description: 'Email subject' })
  @IsString()
  @MinLength(1)
  subject: string;

  @ApiProperty({ example: 'Email body text', description: 'Email body content' })
  @IsString()
  @MinLength(1)
  text: string;

  @ApiPropertyOptional({ description: 'Optional HTML content' })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiPropertyOptional({ description: 'Associated deal ID' })
  @IsOptional()
  @IsString()
  dealId?: string;

  @ApiPropertyOptional({ description: 'Associated contact ID' })
  @IsOptional()
  @IsString()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Associated company ID' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

