/**
 * DTO для метаданных импорта
 * 
 * Предоставляет полную информацию о доступных полях для маппинга,
 * включая системные, кастомные поля, пайплайны и пользователей.
 */

export interface ImportFieldDto {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'multi-select' | 'boolean' | 'text';
  description?: string;
  options?: Array<{ value: string; label: string }>;
  group?: string; // Для группировки полей в UI
}

export interface PipelineStageDto {
  id: string;
  name: string;
  order: number;
  color?: string;
  isDefault?: boolean;
  isClosed?: boolean;
}

export interface PipelineDto {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  stages: PipelineStageDto[];
}

export interface UserDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

export interface ContactsImportMetaDto {
  systemFields: ImportFieldDto[];
  customFields: ImportFieldDto[];
  users: UserDto[];
}

export interface DealsImportMetaDto {
  systemFields: ImportFieldDto[];
  customFields: ImportFieldDto[];
  pipelines: PipelineDto[];
  users: UserDto[];
}

export type ImportMetaResponseDto = ContactsImportMetaDto | DealsImportMetaDto;

