import { IsString, MinLength, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmailNormalized } from '@/common/decorators/is-email-normalized.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email address (will be normalized to lowercase)' })
  @IsEmailNormalized()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: '+7 (999) 999-99-99', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '@username', required: false })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ example: 'MANAGER', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

