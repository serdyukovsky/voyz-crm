import { IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmailNormalized } from '@/common/decorators/is-email-normalized.decorator';

export class UpdateUserDto {
  @ApiProperty({ example: 'user@example.com', required: false, description: 'Email address (will be normalized to lowercase)' })
  @IsOptional()
  @IsEmailNormalized()
  email?: string;

  @ApiProperty({ example: 'password123', required: false })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'MANAGER', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ example: '+7 (999) 999-99-99', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '@username', required: false })
  @IsOptional()
  @IsString()
  telegramUsername?: string;
}

