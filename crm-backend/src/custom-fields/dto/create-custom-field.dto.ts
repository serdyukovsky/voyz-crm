import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { CustomFieldType } from '@prisma/client';

export class CreateCustomFieldDto {
  @ApiProperty({ description: 'Название поля' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Ключ поля (используется в API)', required: false })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({ 
    description: 'Тип поля', 
    enum: ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'EMAIL', 'PHONE', 'URL'] 
  })
  @IsEnum(['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'BOOLEAN', 'EMAIL', 'PHONE', 'URL'])
  type: CustomFieldType;

  @ApiProperty({ description: 'Тип сущности (contact, deal)', enum: ['contact', 'deal'] })
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Группа поля', required: false })
  @IsString()
  @IsOptional()
  group?: string;

  @ApiProperty({ description: 'Обязательное поле', required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @ApiProperty({ 
    description: 'Опции для SELECT/MULTI_SELECT полей',
    required: false,
    type: 'array',
    items: { type: 'string' }
  })
  @IsArray()
  @IsOptional()
  options?: string[];
}

