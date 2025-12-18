/**
 * Field Mapping DTO
 * 
 * Определяет маппинг между CSV колонками и внутренними полями системы
 */

export interface ContactFieldMapping {
  // Стандартные поля
  fullName?: string; // CSV column name
  email?: string;
  phone?: string;
  position?: string;
  companyName?: string;
  companyId?: string;
  tags?: string; // CSV column name, значения будут разделены запятой
  notes?: string;
  
  // Social links (JSON в CSV или отдельные колонки)
  social?: {
    instagram?: string;
    telegram?: string;
    whatsapp?: string;
    vk?: string;
    linkedin?: string;
  };
  
  // Custom fields (key-value pairs)
  customFields?: Record<string, string>; // { "custom_field_key": "CSV column name" }
}

export interface DealFieldMapping {
  // Стандартные поля
  number?: string; // CSV column name
  title?: string;
  amount?: string;
  budget?: string;
  pipelineId?: string;
  stageId?: string;
  assignedToId?: string;
  contactId?: string; // CSV column name для прямого указания contactId
  email?: string; // CSV column name для резолва contactId по email
  phone?: string; // CSV column name для резолва contactId по phone
  companyId?: string;
  expectedCloseAt?: string;
  description?: string;
  tags?: string;
  
  // Custom fields
  customFields?: Record<string, string>;
}

export interface ImportMappingDto {
  entityType: 'contact' | 'deal';
  contactMapping?: ContactFieldMapping;
  dealMapping?: DealFieldMapping;
}

