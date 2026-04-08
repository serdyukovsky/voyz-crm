import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
// CRITICAL: CSV parsing is done on frontend, no need for csv-parser or Readable stream
import { ImportBatchService } from './import-batch.service';
import { PrismaService } from '@/common/services/prisma.service';
import { CustomFieldsService } from '@/custom-fields/custom-fields.service';
import { SystemFieldOptionsService } from '@/system-field-options/system-field-options.service';
import {
  normalizeEmail,
  normalizePhone,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';
import { ContactFieldMapping, DealFieldMapping } from './dto/field-mapping.dto';
import { ImportResultDto, ImportError, ImportSummary, StageToCreate } from './dto/import-result.dto';
import {
  ImportMetaResponseDto,
  ContactsImportMetaDto,
  DealsImportMetaDto,
  ImportFieldDto,
  PipelineDto,
  UserDto,
} from './dto/import-meta.dto';

/**
 * CSV Import Service
 * 
 * Сервис для импорта контактов и сделок из CSV файлов.
 * Использует streaming парсинг для поддержки больших файлов (10k+ строк).
 */
@Injectable()
export class CsvImportService {
  private readonly BATCH_SIZE = 1000;

  constructor(
    private readonly importBatchService: ImportBatchService,
    private readonly prisma: PrismaService,
    private readonly customFieldsService: CustomFieldsService,
    private readonly systemFieldOptionsService: SystemFieldOptionsService,
  ) {}


  /**
   * Получение метаданных полей для импорта
   * Возвращает полную информацию о доступных полях, пайплайнах и пользователях
   */
  async getImportMeta(entityType: 'contact' | 'deal'): Promise<ImportMetaResponseDto> {
    try {
      // ALWAYS return mixed import meta (full list of fields for both contact and deal)
      // This supports MIXED CSV IMPORT where one CSV can contain both entities
      const result = await this.getMixedImportMeta();
      return result;
    } catch (error) {
      console.error('[IMPORT META ERROR] Failed to get import meta:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        entityType,
      });
      throw error;
    }
  }

  /**
   * Получение метаданных для импорта контактов
   */
  private async getContactsImportMeta(): Promise<ContactsImportMetaDto> {
    // Системные поля контактов
    const systemFields: ImportFieldDto[] = [
      { key: 'fullName', label: 'Full Name', required: false, type: 'string', description: 'Полное имя контакта', group: 'basic', entity: 'contact' },
      { key: 'email', label: 'Email', required: false, type: 'email', description: 'Email адрес', group: 'basic', entity: 'contact' },
      { key: 'phone', label: 'Phone', required: false, type: 'phone', description: 'Номер телефона', group: 'basic', entity: 'contact' },
      { key: 'position', label: 'Position', required: false, type: 'string', description: 'Должность', group: 'basic', entity: 'contact' },
      { key: 'companyName', label: 'Company Name', required: false, type: 'string', description: 'Название компании', group: 'basic', entity: 'contact' },
      { key: 'link', label: 'Link', required: false, type: 'string', description: 'Ссылка', group: 'other', entity: 'contact' },
      { key: 'subscriberCount', label: 'Subscriber Count', required: false, type: 'string', description: 'Кол-во подписчиков', group: 'other', entity: 'contact' },
      { key: 'directions', label: 'Directions', required: false, type: 'string', description: 'Направление (через запятую)', group: 'other', entity: 'contact' },
      { key: 'contactMethods', label: 'Contact Methods', required: false, type: 'string', description: 'Способ связи (через запятую): Whatsapp, Telegram, Direct', group: 'other', entity: 'contact' },
      { key: 'websiteOrTgChannel', label: 'Website/TG Channel', required: false, type: 'string', description: 'Сайт, тг канал', group: 'other', entity: 'contact' },
      { key: 'contactInfo', label: 'Contact Info', required: false, type: 'string', description: 'Контакт (номер телефона или никнейм в телеграме)', group: 'other', entity: 'contact' },
      { key: 'tags', label: 'Tags', required: false, type: 'string', description: 'Теги (через запятую)', group: 'other', entity: 'contact' },
      { key: 'notes', label: 'Notes', required: false, type: 'text', description: 'Заметки', group: 'other', entity: 'contact' },
      { key: 'instagram', label: 'Instagram', required: false, type: 'string', description: 'Instagram профиль', group: 'social', entity: 'contact' },
      { key: 'telegram', label: 'Telegram', required: false, type: 'string', description: 'Telegram контакт', group: 'social', entity: 'contact' },
      { key: 'whatsapp', label: 'WhatsApp', required: false, type: 'string', description: 'WhatsApp номер', group: 'social', entity: 'contact' },
      { key: 'vk', label: 'VK', required: false, type: 'string', description: 'VK профиль', group: 'social', entity: 'contact' },
    ];

    // Получение кастомных полей контактов (если есть в schema)
    const customFields: ImportFieldDto[] = await this.getContactCustomFields();

    // Получение активных пользователей
    const users: UserDto[] = await this.getActiveUsers();

    return {
      systemFields,
      customFields,
      users,
    };
  }

  /**
   * Получение метаданных для импорта сделок
   */
  private async getDealsImportMeta(): Promise<DealsImportMetaDto> {
    // Системные поля сделок
    const systemFields: ImportFieldDto[] = [
      { key: 'number', label: 'Deal Number', required: false, type: 'string', description: 'Номер сделки', group: 'basic', entity: 'deal' },
      { key: 'title', label: 'Title', required: true, type: 'string', description: 'Название сделки', group: 'basic', entity: 'deal' },
      { key: 'stageId', label: 'Stage', required: false, type: 'stage', description: 'Имя стадии (будет автоматически резолвлено в выбранном pipeline)', group: 'basic', entity: 'deal' },
      { key: 'ownerId', label: 'Owner', required: false, type: 'user', description: 'Владелец сделки (имя или email пользователя, будет автоматически резолвлено)', group: 'basic', entity: 'deal' },
      { key: 'amount', label: 'Amount', required: false, type: 'number', description: 'Сумма сделки', group: 'basic', entity: 'deal' },
      // CRITICAL: pipelineId is NOT a mappable field - it's passed separately as a top-level parameter
      // Do NOT include it in systemFields to prevent it from being mapped to CSV columns
      { key: 'email', label: 'Contact Email', required: false, type: 'email', description: 'Email контакта для связи', group: 'contact', entity: 'deal' },
      { key: 'phone', label: 'Contact Phone', required: false, type: 'phone', description: 'Телефон контакта для связи', group: 'contact', entity: 'deal' },
      { key: 'assignedToId', label: 'Assigned To', required: false, type: 'user', description: 'Ответственный (имя или email пользователя, будет автоматически резолвлено)', group: 'basic', entity: 'deal' },
      { key: 'expectedCloseAt', label: 'Expected Close Date', required: false, type: 'date', description: 'Ожидаемая дата закрытия', group: 'other', entity: 'deal' },
      { key: 'createdAt', label: 'Created Date', required: false, type: 'date', description: 'Дата создания сделки', group: 'other', entity: 'deal' },
      { key: 'description', label: 'Description', required: false, type: 'text', description: 'Описание', group: 'other', entity: 'deal' },
      { key: 'reason', label: 'Reason', required: false, type: 'string', description: 'Причина/основание', group: 'other', entity: 'deal' },
      { key: 'rejectionReasons', label: 'Rejection Reasons', required: false, type: 'string', description: 'Причина отказа (через запятую)', group: 'other', entity: 'deal' },
      { key: 'tags', label: 'Tags', required: false, type: 'string', description: 'Теги (через запятую)', group: 'other', entity: 'deal' },
      // Contact fields (для создания/обновления связанного контакта)
      { key: 'fullName', label: 'Contact Full Name', required: false, type: 'string', description: 'Полное имя контакта', group: 'contact', entity: 'deal' },
      { key: 'position', label: 'Contact Position', required: false, type: 'string', description: 'Должность контакта', group: 'contact', entity: 'deal' },
      { key: 'companyName', label: 'Contact Company Name', required: false, type: 'string', description: 'Название компании контакта', group: 'contact', entity: 'deal' },
      { key: 'contactMethods', label: 'Contact Methods', required: false, type: 'string', description: 'Способ связи (через запятую): Whatsapp, Telegram, Direct', group: 'contact', entity: 'deal' },
      { key: 'directions', label: 'Contact Directions', required: false, type: 'string', description: 'Направление (через запятую)', group: 'contact', entity: 'deal' },
      { key: 'link', label: 'Contact Link', required: false, type: 'string', description: 'Ссылка контакта', group: 'contact', entity: 'deal' },
      { key: 'subscriberCount', label: 'Contact Subscriber Count', required: false, type: 'string', description: 'Кол-во подписчиков', group: 'contact', entity: 'deal' },
      { key: 'websiteOrTgChannel', label: 'Contact Website/TG Channel', required: false, type: 'string', description: 'Сайт, тг канал', group: 'contact', entity: 'deal' },
      { key: 'contactInfo', label: 'Contact Info', required: false, type: 'string', description: 'Контакт (номер телефона или никнейм в телеграме)', group: 'contact', entity: 'deal' },
      { key: 'notes', label: 'Contact Notes', required: false, type: 'text', description: 'Заметки контакта', group: 'contact', entity: 'deal' },
    ];

    // Получение кастомных полей сделок
    const customFields: ImportFieldDto[] = await this.getDealCustomFields();

    // CRITICAL RUNTIME CHECK: systemFields must not be empty
    // This is a programming error - systemFields are statically defined and should never be empty
    if (!systemFields || systemFields.length === 0) {
      const errorMessage = 'FATAL: Deal systemFields is empty. This is a programming error - systemFields must be defined in getDealsImportMeta().';
      console.error('[IMPORT META FATAL ERROR]', {
        error: errorMessage,
        systemFields,
        systemFieldsType: typeof systemFields,
        systemFieldsIsArray: Array.isArray(systemFields),
      });
      throw new Error(errorMessage);
    }

    // Получение пайплайнов со стадиями
    const pipelines: PipelineDto[] = await this.getPipelinesWithStages();

    // Получение активных пользователей
    const users: UserDto[] = await this.getActiveUsers();

    const result = {
      systemFields,
      customFields,
      pipelines,
      users,
    };
    
    
    return result;
  }

  /**
   * Получение метаданных для MIXED импорта (контакты + сделки в одном плоском массиве)
   */
  private async getMixedImportMeta(): Promise<any> {
    try {
      // Получаем метаданные контактов
      const contactMeta = await this.getContactsImportMeta();
      
      // Получаем метаданные сделок
      const dealMeta = await this.getDealsImportMeta();
    
    // CRITICAL: Ensure systemFields and customFields are always arrays (never undefined)
    const systemFields = Array.isArray(dealMeta.systemFields) ? dealMeta.systemFields : [];
    const customFields = Array.isArray(dealMeta.customFields) ? dealMeta.customFields : [];
    
    // CRITICAL RUNTIME CHECK: systemFields must not be empty
    // Empty systemFields means frontend cannot show fields for mapping, causing silent fail
    // This is a FATAL error - import cannot work without systemFields
    if (!systemFields || systemFields.length === 0) {
      const errorMessage = 'FATAL: systemFields is empty or undefined. Import meta is corrupted. This prevents users from creating field mappings.';
      console.error('[IMPORT META FATAL ERROR]', {
        error: errorMessage,
        dealMetaSystemFields: dealMeta.systemFields,
        dealMetaSystemFieldsType: typeof dealMeta.systemFields,
        dealMetaSystemFieldsIsArray: Array.isArray(dealMeta.systemFields),
        dealMetaSystemFieldsLength: Array.isArray(dealMeta.systemFields) ? dealMeta.systemFields.length : 'N/A',
        contactMetaSystemFieldsLength: Array.isArray(contactMeta.systemFields) ? contactMeta.systemFields.length : 'N/A',
      });
      throw new Error(errorMessage);
    }
    
    // Объединяем все поля в один плоский массив
    const allFields: ImportFieldDto[] = [
      ...(Array.isArray(contactMeta.systemFields) ? contactMeta.systemFields : []),
      ...(Array.isArray(contactMeta.customFields) ? contactMeta.customFields : []),
      ...systemFields,
      ...customFields,
    ];
    
    const result = {
      // CRITICAL: Always return systemFields and customFields for backward compatibility
      // Frontend expects these fields to always be present (even if empty arrays)
      systemFields, // Deal system fields (pipelineId is NOT included per requirements)
      customFields, // Deal custom fields
      fields: allFields, // Flat array with entity property on each field (for mixed import)
      pipelines: dealMeta.pipelines || [],
      users: dealMeta.users || [],
    };
    
    
    return result;
    } catch (error) {
      console.error('🔥🔥🔥 getMixedImportMeta - ERROR:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Получение кастомных полей контактов
   */
  private async getContactCustomFields(): Promise<ImportFieldDto[]> {
    // TODO: Implement custom fields for contacts when schema supports it
    // For now, return empty array
    return [];
  }

  /**
   * Получение кастомных полей сделок
   */
  private async getDealCustomFields(): Promise<ImportFieldDto[]> {
    try {
      if (!this.prisma) {
        throw new Error('PrismaService is NOT injected');
      }
      const customFields = await this.prisma.customField.findMany({
        where: { isActive: true, entityType: 'DEAL' },
        orderBy: { order: 'asc' },
      });

      return customFields.map((field) => ({
        key: `customField_${field.id}`,
        label: field.name,
        required: field.isRequired || false,
        type: this.mapCustomFieldType(field.type),
        description: field.description || undefined,
        options: field.options ? this.mapCustomFieldOptions(field.options) : undefined,
        group: 'custom',
        entity: 'deal' as const,
      }));
    } catch (error) {
      console.error('Error fetching deal custom fields:', error);
      return [];
    }


  }

  /**
   * Маппинг типа кастомного поля в ImportFieldDto type
   */
  private mapCustomFieldType(type: string): ImportFieldDto['type'] {
    const typeMap: Record<string, ImportFieldDto['type']> = {
      text: 'string',
      number: 'number',
      date: 'date',
      select: 'select',
      'multi-select': 'multi-select',
      textarea: 'text',
      checkbox: 'boolean',
      email: 'email',
      phone: 'phone',
    };

    return typeMap[type] || 'string';
  }

  /**
   * Маппинг опций кастомного поля
   */
  private mapCustomFieldOptions(options: any): Array<{ value: string; label: string }> {
    if (Array.isArray(options)) {
      return options.map((opt) => ({
        value: typeof opt === 'string' ? opt : opt.value || opt,
        label: typeof opt === 'string' ? opt : opt.label || opt.value || opt,
      }));
    }


    return [];
  }

  /**
   * Получение всех пайплайнов со стадиями
   */
  private async getPipelinesWithStages(): Promise<PipelineDto[]> {
    try {
      if (!this.prisma) {
        throw new Error('PrismaService is NOT injected');
      }
      const pipelines = await this.prisma.pipeline.findMany({
        where: { isActive: true },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });

      return pipelines.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description || undefined,
      isDefault: pipeline.isDefault,
      isActive: pipeline.isActive,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        order: stage.order,
        color: stage.color || undefined,
        isDefault: stage.isDefault || false,
        type: stage.type || 'OPEN',
      })),
    }));
    } catch (error) {
      console.error('[IMPORT META ERROR] Error fetching pipelines:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        prismaError: error,
      });
      // Return empty array instead of throwing to prevent 500 error
      // Frontend will show "No pipelines found" message
      return [];
    }
  }

  /**
   * Получение активных пользователей
   */
  private async getActiveUsers(): Promise<UserDto[]> {
    if (!this.prisma) {
      throw new Error('PrismaService is NOT injected');
    }
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((user) => ({
      id: user.id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    }));
  }

  /**
   * Импорт контактов из CSV
   * 
   * @param rows - Parsed CSV rows from frontend (CSV parsing is done on frontend)
   * @param mapping - Маппинг полей CSV → внутренние поля
   * @param userId - ID пользователя, выполняющего импорт
   * @param dryRun - Режим предпросмотра без записи в БД
   */
  async importContacts(
    rows: Record<string, string>[], // Parsed CSV rows from frontend
    mapping: ContactFieldMapping,
    userId: string,
    dryRun: boolean = false,
  ): Promise<ImportResultDto> {
    // CRITICAL: CSV parsing is done on frontend, backend receives parsed rows
    const summary: ImportSummary = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
    };

    const errors: ImportError[] = [];
    const contactRows: Array<{
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
      companyName?: string | null;
      companyId?: string | null;
      tags?: string[];
      notes?: string | null;
      social?: any;
      link?: string | null;
      subscriberCount?: string | null;
      directions?: string[];
      contactMethods?: string[];
      websiteOrTgChannel?: string | null;
      contactInfo?: string | null;
    }> = [];

    // Process rows directly (no stream parsing needed)
    rows.forEach((csvRow, index) => {
      const rowNumber = index + 1; // Row numbers start at 1
          summary.total++;

          try {
        // Trim all string values
        const trimmedRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(csvRow)) {
          trimmedRow[key] = typeof value === 'string' ? value.trim() : value;
        }

        // Skip empty rows
        const isEmptyRow = Object.values(trimmedRow).every(val => !val || val.trim() === '');
        if (isEmptyRow) {
          summary.skipped++;
          return;
        }

        const contactData = this.mapContactRow(trimmedRow, mapping, rowNumber, errors);
            if (contactData) {
          contactRows.push(contactData);
            } else {
              summary.skipped++;
            }
          } catch (error) {
            errors.push({
              row: rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            summary.failed++;
          }
          });

            // Batch обработка контактов
    if (contactRows.length > 0) {
              if (dryRun) {
                // В режиме dry-run только симулируем импорт
                // Проверяем существующие контакты для подсчета willUpdate
        const emails = contactRows.map(r => r.email).filter((e): e is string => Boolean(e));
        const phones = contactRows.map(r => r.phone).filter((p): p is string => Boolean(p));
        
        if (emails.length > 0 || phones.length > 0) {
          try {
                const existingMap = await this.importBatchService.batchFindContactsByEmailOrPhone(emails, phones);
                
                let willCreate = 0;
                let willUpdate = 0;
                
            contactRows.forEach((row) => {
                  const key = row.email ? `email:${row.email}` : row.phone ? `phone:${row.phone}` : null;
                  if (key && existingMap.has(key)) {
                    willUpdate++;
                  } else {
                    willCreate++;
                  }
                });
                
                summary.created = willCreate;
                summary.updated = willUpdate;
          } catch (error) {
            // In dry-run, if DB check fails, just count all as "would create"
            summary.created = contactRows.length;
            summary.updated = 0;
          }
              } else {
          // No emails or phones - all would be created
          summary.created = contactRows.length;
          summary.updated = 0;
        }
      } else {
        const result = await this.importBatchService.batchCreateContacts(contactRows, userId);
                summary.created += result.created;
                summary.updated += result.updated;
                summary.failed += result.errors.length;

                // Преобразуем batch ошибки в ImportError
                result.errors.forEach((err) => {
                  errors.push({
                    row: err.row >= 0 ? err.row : -1,
                    error: err.error,
                  });
                });
              }
            }

    return {
              summary,
              errors,
    };
  }

  /**
   * Импорт сделок из CSV
   * 
   * CRITICAL: CSV parsing is done on frontend, backend receives parsed rows
   * @param rows - Parsed CSV rows from frontend
   * @param mapping - Маппинг полей CSV → внутренние поля
   * @param user - Пользователь, выполняющий импорт
   * @param pipelineId - ID пайплайна для resolution стадий по имени (deals связаны с pipeline)
   * @param defaultAssignedToId - Дефолтный ответственный для всех строк (для "apply to all")
   * @param contactEmailPhoneMap - Map для резолва contactId по email/phone (опционально)
   * @param dryRun - Режим предпросмотра без записи в БД
   */
  async importDeals(
    rows: Record<string, string>[], // Parsed CSV rows from frontend
    mapping: DealFieldMapping,
    user: any,
    pipelineId: string | undefined, // Optional for dry-run, required for actual import
    defaultAssignedToId?: string, // Дефолтный ответственный для всех строк (для "apply to all")
    contactEmailPhoneMap?: Map<string, string>, // Map для резолва contactId по email/phone
    dryRun: boolean = false,
    userValueMapping?: Record<string, string>, // Manual mapping: { "CSV value": "user-id" }
  ): Promise<ImportResultDto> {
    // 🔥 DIAGNOSTIC: Log entry point
    
    // 🔥 DIAGNOSTIC: Log first row sample
    if (rows && rows.length > 0) {
    }
    
    // CRITICAL: Top-level try/catch to prevent 500 errors
    try {
      // CRITICAL: Validate user object early to prevent crashes
      if (!user) {
        console.error('[IMPORT DEALS ERROR] User object is null or undefined');
        if (dryRun) {
          return {
            summary: { total: 0, created: 0, updated: 0, failed: 0, skipped: 0 },
            errors: [],
            globalErrors: ['User is required for import'],
          };
        }
        throw new BadRequestException('User is required for import');
      }
      
      // Initialize error arrays
      const errors: ImportError[] = []; // Row-specific errors only (row >= 0)
      const globalErrors: string[] = []; // Global errors (mapping, pipeline, etc.)
      const warnings: string[] = [];

      // Get userId from user object
      const userId = user?.id || user?.userId;
      
      // Log mapping and context before validation - ensure keys match expectations

      const summary: ImportSummary = {
        total: 0,
        created: 0,
        updated: 0,
        failed: 0,
        skipped: 0,
      };

      // Defensive guards - collect global errors instead of row errors
      // BUT: Never early-return before CSV processing
      if (!user) {
        globalErrors.push('User is missing');
        // Continue to CSV processing - errors will be shown in preview
      }
      
      // PipelineId validation - required for actual import, optional for dry-run
      // If missing in actual import, this should have been caught in controller, but safety check
      if (!pipelineId || pipelineId === null || typeof pipelineId !== 'string' || (typeof pipelineId === 'string' && pipelineId.trim() === '')) {
        if (dryRun) {
          warnings.push('Pipeline ID is missing, stage validation will be skipped');
        } else {
          // For actual import, pipelineId is required
          globalErrors.push('Pipeline ID is required for deal import');
          if (globalErrors.length > 0) {
            return { summary, errors, globalErrors, warnings };
          }
        }
      }

      // CRITICAL: Safe access to userId - user is already validated above
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.error('[IMPORT DEALS ERROR] User ID is missing:', { userId, userKeys: user ? Object.keys(user) : [] });
        globalErrors.push('User ID is required');
        // Continue to CSV processing - validation will show errors
      }

    if (!mapping || typeof mapping !== 'object') {
        globalErrors.push('Mapping is required and must be an object');
        // Continue to CSV processing - validation will show errors
      }

      // CRITICAL: Remove pipelineId from mapping if present
      // pipelineId is a top-level parameter, NOT a CSV column mapping
      // If it's in mapping, backend will try to find CSV column named "pipelineId" and fail
      if (mapping && 'pipelineId' in mapping) {
        console.warn('[IMPORT DEALS] WARNING: pipelineId found in mapping - removing it. pipelineId should be passed as separate parameter, not in mapping.');
        delete mapping.pipelineId;
    }

    if (!mapping.title || typeof mapping.title !== 'string' || mapping.title.trim() === '') {
        globalErrors.push('Mapping must include title field');
        // Continue to CSV processing - validation will show errors
      }
      
      // If critical global errors exist, return early (but still allow CSV preview in dry-run)
      if (globalErrors.length > 0 && !dryRun) {
        return { summary, errors, globalErrors };
      }

      // Load pipeline stages - wrap in try/catch for dry-run safety
      // CRITICAL: NEVER load pipeline if pipelineId is missing
      // CRITICAL: NEVER access pipeline.stages if pipeline is null
      let stagesMap: Map<string, string>;
      let defaultStageId: string | undefined;
      let pipeline: any = null;
      let pipelineLoaded = false;
      let stagesCount = 0;
      
      // CRITICAL: Only load pipeline if pipelineId is provided and valid
      if (pipelineId && pipelineId !== null && typeof pipelineId === 'string' && pipelineId.trim() !== '') {
        try {
          // CRITICAL: Always try to load pipeline, even in dry-run
          // Pipeline model doesn't have workspaceId, so we load it by ID only
            
            if (!this.prisma) {
              throw new Error('PrismaService is NOT injected');
            }
            pipeline = await this.prisma.pipeline.findUnique({
      where: { id: pipelineId },
              include: {
                stages: {
                  orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
                },
              },
            });
            
            
            if (!pipeline) {
              // Pipeline not found - pipeline remains null
              // Pipeline is optional - import continues without stage validation
              warnings.push(`Pipeline with ID "${pipelineId}" not found, stage validation will be skipped`);
              stagesMap = new Map<string, string>();
              defaultStageId = undefined;
            } else {
              pipelineLoaded = true;
              // CRITICAL: Only access pipeline.stages if pipeline is not null
              if (pipeline.stages && Array.isArray(pipeline.stages)) {
                stagesCount = pipeline.stages.length;
                defaultStageId = pipeline.stages.find((s: any) => s.isDefault)?.id || pipeline.stages[0]?.id;
                stagesMap = new Map<string, string>();
                
                // Build stages map: stageName (normalized) -> stageId, stageId -> stageId
                pipeline.stages.forEach((stage: any) => {
                  const normalizedName = stage.name.toLowerCase().trim();
                  stagesMap.set(normalizedName, stage.id);
                  stagesMap.set(stage.name, stage.id);
                  stagesMap.set(stage.id, stage.id);
                });
              } else {
                stagesMap = new Map<string, string>();
                defaultStageId = undefined;
              }
            }
        } catch (error) {
          console.error('[IMPORT DEALS DRY RUN ERROR] Failed to load pipeline:', error);
          // Pipeline is optional - if loading fails, import continues without stage validation
          warnings.push(`Failed to load pipeline: ${error instanceof Error ? error.message : 'Unknown error'}. Stage validation will be skipped.`);
          // Continue to CSV processing - pipeline is optional
          stagesMap = new Map<string, string>();
          defaultStageId = undefined;
          pipeline = null;
        }
      } else {
        // No pipelineId provided - initialize empty maps
        // Pipeline remains null - will be handled at row level
        stagesMap = new Map<string, string>();
        defaultStageId = undefined;
      }
      
      // Load users for resolution - wrap in try/catch for dry-run safety
      let usersMap: Map<string, string>;
      try {
        if (!this.prisma) {
          throw new Error('PrismaService is NOT injected');
        }
        const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
          
          usersMap = new Map<string, string>();
          users.forEach((user) => {
            if (user.email) {
              usersMap.set(`email:${user.email.toLowerCase()}`, user.id);
            }
            if (user.firstName && user.lastName) {
              const fullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
              usersMap.set(`name:${fullName}`, user.id);
            }
          });
      } catch (error) {
        // CRITICAL: Log Prisma error with full details
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'N/A';
        console.error('[IMPORT DEALS ERROR] Failed to load users (Prisma error):', {
          error: errorMessage,
          stack: errorStack,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          prismaError: error,
        });
        // Don't fail import - owner resolution will just not work
        // But add warning so user knows about the issue
        warnings.push(`Failed to load users: ${errorMessage}. Owner resolution will be skipped.`);
        usersMap = new Map<string, string>();
      }
    
    // CRITICAL: Validate rows - CSV parsing is done on frontend
    // In dry-run, return globalErrors instead of throwing
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      globalErrors.push('Rows are required and must be a non-empty array');
      // In dry-run, NEVER throw - always return 200 with errors
      if (dryRun) {
        return { summary, errors, globalErrors, warnings };
      }
      // In actual import, this should have been caught in controller, but safety check
      return { summary, errors, globalErrors, warnings };
    }
    
    // Log: Сразу после парсинга CSV
    
    // Map для сбора всех стадий из CSV (stageName -> firstRowNumber)
    const csvStagesMap = new Map<string, number>();
    
    const processedRows: Array<{
      number?: string;
      title: string;
      amount?: number | string | null;
      budget?: number | string | null;
      pipelineId: string | undefined; // Optional - may be undefined for dry-run
      stageId?: string;
      stageValue?: string; // Оригинальное значение стадии из CSV (для создания стадий)
      assignedToId?: string | null;
      contactId?: string | null;
      companyId?: string | null;
      expectedCloseAt?: Date | string | null;
      description?: string | null;
      tags?: string[];
      rejectionReasons?: string[];
      reason?: string | null;
    }> = [];

    // CRITICAL: Process rows directly - CSV parsing is done on frontend
    // Process rows synchronously (no Promise/stream needed)
    try {
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const csvRow = rows[rowIndex];
        const rowNumber = rowIndex + 1; // 1-based row numbers (first data row is 1)
        
        // CRITICAL: Trim all string values in CSV row before processing
        // This ensures consistent validation and prevents whitespace issues
        const trimmedRow: Record<string, string> = {};
        for (const [key, value] of Object.entries(csvRow)) {
          if (value && typeof value === 'string') {
            trimmedRow[key] = value.trim();
          } else {
            trimmedRow[key] = value || '';
          }
        }
        
        // CRITICAL: Skip empty rows before validation
        // Check if row is empty (all values are empty/whitespace after trim)
        const isEmptyRow = Object.values(trimmedRow).every(val => !val || val === '');
        if (isEmptyRow) {
          const reason = 'Empty row';
          const titleColumn = mapping.title;
          const title = titleColumn ? (trimmedRow[titleColumn] || '') : '';
          summary.skipped++;
          continue;
        }
        
          summary.total++;

        // CRITICAL: Wrap EACH row processing in try/catch - NEVER throw
        try {
          // Log mapping and parsed row before validation (first row only for debugging)
          if (rowNumber === 1) {
          }
          
          // Defensive guards for each row
          const rowErrors: ImportError[] = [];
          
          // Pipeline is OPTIONAL - used only for soft validation of stageId
          // If pipeline is missing or not loaded, import continues without stage validation
          // Pipeline does NOT block import or cause rows to fail automatically
          
          // Guard 1: Deal title check - ONLY required field
          // Use trimmedRow - values are already trimmed
          const titleColumn = mapping.title;
          const titleValue = titleColumn ? (trimmedRow[titleColumn] || '') : '';
          if (!titleValue) {
            rowErrors.push({
              row: rowNumber,
              field: 'title',
              error: 'Deal title is required',
            });
          }
          
          // If critical errors (title missing), skip row
          if (rowErrors.length > 0) {
            const reason = rowErrors.map(e => e.error).join('; ') || 'Critical validation errors';
            const title = titleValue || '';
            errors.push(...rowErrors);
            summary.failed++;
            continue;
          }
          
          // Process row with mapDealRow (it also handles errors internally)
          // Pass trimmedRow instead of csvRow - all values are already trimmed
            const dealData = this.mapDealRow(
            trimmedRow,
              mapping,
              rowNumber,
              errors,
              pipelineId,
              stagesMap,
              usersMap,
              defaultAssignedToId,
              contactEmailPhoneMap,
              csvStagesMap,
              userValueMapping,
            );
          
            if (dealData) {
            // Log dealData to verify all fields are present
            
            // Guard 3: Stage check (if no stageValue and no defaultStage)
            if (!dealData.stageId && !dealData.stageValue && !defaultStageId) {
            errors.push({
              row: rowNumber,
                field: 'stageId',
                error: 'Stage is required. Please map a stage field or ensure pipeline has a default stage.',
            });
            const reason = 'Stage is required. Please map a stage field or ensure pipeline has a default stage.';
            const titleColumn = mapping.title;
            const title = titleColumn ? (trimmedRow[titleColumn] || '') : '';
            summary.failed++;
              continue;
            }
            
            processedRows.push(dealData);
          } else {
            summary.skipped++;
          }
        } catch (error) {
          // NEVER throw - always collect error
          console.error(`[IMPORT DEALS DRY RUN ERROR] Error in row ${rowNumber}:`, error);
          errors.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : 'Unknown error processing row',
          });
          summary.failed++;
        }
      }
    } catch (error) {
      // CRITICAL: Log Prisma error with full details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('[IMPORT DEALS ERROR] Error processing rows loop (Prisma error):', {
        error: errorMessage,
        stack: errorStack,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        prismaError: error,
        rowsCount: rows.length,
        processedRowsCount: processedRows.length,
      });
      // CRITICAL: Add to globalErrors and increase failed count
      globalErrors.push(`Error processing rows: ${errorMessage}`);
      // CRITICAL: Mark all remaining rows as failed
      const remainingRows = rows.length - processedRows.length;
      if (remainingRows > 0) {
        summary.failed += remainingRows;
        // Add errors for each remaining row
        for (let i = processedRows.length; i < rows.length; i++) {
          errors.push({
            row: i + 1,
            error: `Row processing failed: ${errorMessage}`,
          });
        }
      }
    }

      // Process stages and create deals (async operations)
      try {
        
            const stagesToCreate: StageToCreate[] = [];
            
        if (processedRows.length > 0) {
              // Pipeline already loaded above, use it
              // Pipeline is optional - if not found, stage creation is skipped but import continues
              if (!pipeline && pipelineId) {
                // Pipeline not found - already handled in loading section, but double-check
                warnings.push(`Pipeline with ID "${pipelineId}" not found, stage resolution skipped`);
              }
              
              // Only process stages if we have pipeline
              // CRITICAL: NEVER access pipeline.stages if pipeline is null
              if (pipeline && pipeline.stages && Array.isArray(pipeline.stages)) {
              
              // Собираем уникальные стадии из CSV и сравниваем с существующими
              const existingStageNames = new Set(
                pipeline.stages.map(s => s.name.toLowerCase())
              );
              const stagesToCreateMap = new Map<string, number>(); // stageName -> order
              
              // Определяем стадии, которые нужно создать
              csvStagesMap.forEach((firstRowNumber, stageName) => {
                // Безопасная обработка stageName - проверяем что это строка
                if (!stageName || typeof stageName !== 'string') {
                  console.warn(`Invalid stageName in csvStagesMap: ${stageName}, skipping`);
                  return;
                }
                
                const normalizedName = stageName.toLowerCase().trim();
                if (!existingStageNames.has(normalizedName)) {
                  // Стадия не существует - нужно создать
                  const order = stagesToCreate.length + pipeline.stages.length;
                  const trimmedName = stageName.trim();
                  stagesToCreate.push({
                    name: trimmedName, // Сохраняем оригинальное имя (с учетом регистра)
                    order: order,
                  });
                  stagesToCreateMap.set(trimmedName, order);
                }
              });
              
              // Сортируем стадии по порядку первого появления в CSV
              stagesToCreate.sort((a, b) => {
                const aRow = csvStagesMap.get(a.name) || 0;
                const bRow = csvStagesMap.get(b.name) || 0;
                return aRow - bRow;
              });
              
              // Обновляем order для стадий с учетом порядка появления
              // CRITICAL: pipeline.stages is already checked above (pipeline && pipeline.stages)
              if (pipeline && pipeline.stages) {
              stagesToCreate.forEach((stage, index) => {
                stage.order = pipeline.stages.length + index;
              });
              }
              } else if (dryRun) {
                // In dry-run, collect stages from CSV for preview
                csvStagesMap.forEach((firstRowNumber, stageName) => {
                  if (stageName && typeof stageName === 'string') {
                    const trimmedName = stageName.trim();
                    if (!stagesToCreate.find(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
                      stagesToCreate.push({
                        name: trimmedName,
                        order: stagesToCreate.length,
                      });
                    }
                  }
                });
              }
              
              // CRITICAL: In dry-run, NEVER create stages - only collect them
              // Also require pipeline for stage creation
              const createdStagesMap = new Map<string, string>(); // normalizedStageName -> stageId
              
              if (!dryRun && stagesToCreate.length > 0 && pipeline) {
                // Only create stages in actual import mode with pipeline
                
                for (const stageToCreate of stagesToCreate) {
                  try {
                    if (!this.prisma) {
                      throw new Error('PrismaService is NOT injected');
                    }
                    const newStage = await this.prisma.stage.create({
                      data: {
                        name: stageToCreate.name,
                        order: stageToCreate.order,
                        pipelineId: pipelineId,
                        color: '#6B7280',
                        isDefault: false,
                        type: 'OPEN',
                      },
                    });
                    
                    const normalizedName = stageToCreate.name.toLowerCase().trim();
                    createdStagesMap.set(normalizedName, newStage.id);
                    stagesMap.set(stageToCreate.name, newStage.id);
                    stagesMap.set(normalizedName, newStage.id);
                    stagesMap.set(newStage.id, newStage.id);
                  } catch (error) {
                    // CRITICAL: Log Prisma error with full details
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    const errorStack = error instanceof Error ? error.stack : 'N/A';
                    console.error('[IMPORT DEALS ERROR] Failed to create stage (Prisma error):', {
                      stageName: stageToCreate.name,
                      error: errorMessage,
                      stack: errorStack,
                      errorType: error instanceof Error ? error.constructor.name : typeof error,
                      prismaError: error,
                    });
                    // Collect error and increase failed count
                    const rowNumber = csvStagesMap.get(stageToCreate.name) || -1;
                    errors.push({
                      row: rowNumber,
                      field: 'stageId',
                      value: stageToCreate.name,
                      error: `Failed to create stage "${stageToCreate.name}": ${errorMessage}`,
                    });
                    // CRITICAL: Increase failed count for stage creation error
                    summary.failed++;
                  }
                }
              } else if (!dryRun && stagesToCreate.length > 0) {
                // In actual import without pipeline, cannot create stages
                // Pipeline is optional - if missing, stage creation is skipped but import continues
                console.warn('[IMPORT DEALS WARNING] Cannot create stages:', {
                  stagesToCreateCount: stagesToCreate.length,
                  hasPipeline: !!pipeline,
                  dryRun,
                });
                if (!pipeline) {
                  warnings.push('Cannot create stages: pipeline is not loaded. Stage creation skipped, but import continues.');
                }
              }
              // In dry-run, stagesToCreate is already populated for reporting
              
              // Update stageId for rows with created stages or apply default
              const updatedRows = processedRows.map((row) => {
                // CRITICAL: Preserve ALL fields from row, not just stageId
                const updatedRow = { ...row };
                
                // If stageId not set but stageValue exists, try to find in created stages
                if (!updatedRow.stageId && updatedRow.stageValue) {
                  const stageValueStr = typeof row.stageValue === 'string' ? row.stageValue : String(row.stageValue || '');
                  const normalizedStageName = stageValueStr.trim().toLowerCase();
                  
                  // Try to find in created stages (from actual import, not dry-run)
                  let createdStageId: string | undefined;
                  for (const [name, id] of createdStagesMap.entries()) {
                    const nameStr = typeof name === 'string' ? name : String(name || '');
                    if (nameStr.toLowerCase().trim() === normalizedStageName) {
                      createdStageId = id;
                      break;
                    }
                  }
                  
                  if (createdStageId) {
                    updatedRow.stageId = createdStageId;
                  } else {
                    // Try to find in existing stages map
                    let foundStageId: string | undefined;
                    for (const [name, id] of stagesMap.entries()) {
                      const nameStr = typeof name === 'string' ? name : String(name || '');
                      if (nameStr.toLowerCase().trim() === normalizedStageName) {
                        foundStageId = id;
                        break;
                      }
                    }
                    if (foundStageId) {
                      updatedRow.stageId = foundStageId;
                    } else if (defaultStageId) {
                      updatedRow.stageId = defaultStageId;
                    }
                  }
                } else if (!updatedRow.stageId && !updatedRow.stageValue && defaultStageId) {
                  // No stageValue, apply default stage
                  updatedRow.stageId = defaultStageId;
                }
                // CRITICAL: Return updatedRow with ALL fields preserved
                return updatedRow;
              });
              
              // Filter valid rows (must have stageId or stageValue)
              // CRITICAL: If no stageId and no stageValue, use defaultStageId if available
              
              const validRows = updatedRows.filter(row => {
                // Row is valid if it has stageId, stageValue, or we can use defaultStageId
                if (row.stageId || row.stageValue) {
                  return true;
                }
                // If no stage but defaultStageId exists, row is still valid (will use default)
                if (defaultStageId) {
                  // Set default stageId for rows without stage
                  row.stageId = defaultStageId;
                  return true;
                }
                return false;
              });
              
              
              
              if (validRows.length > 0) {
                if (dryRun) {
                  // Log: Перед dry-run simulate
                  // CRITICAL: Dry-run must execute ALL the same validations as actual import
                  // The ONLY difference: NO DB write operations (no batchCreateDeals call)
                  
                  // CRITICAL: Execute ALL the same validations as actual import
                  // Filter out rows without valid stageId, title, pipelineId
                  const dealsWithNumber: Array<{
                    number: string;
                    customFields?: Record<string, any>;
                    title: string;
                    amount?: number | string | null;
                    budget?: number | string | null;
                    pipelineId: string;
                    stageId: string;
                    assignedToId?: string | null;
                    contactId?: string | null;
                    companyId?: string | null;
                    expectedCloseAt?: Date | string | null;
                    description?: string | null;
                    tags?: string[];
                    rejectionReasons?: string[];
                    reason?: string | null;
                  }> = [];
                  
                  // CRITICAL: Execute the SAME validation loop as actual import
                  for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
                    const row: any = validRows[rowIndex];
                    const rowNumber = rowIndex + 1;
                    
                    // DRY-RUN: allow stageValue without stageId (stage may be created on import)
                    // Only fail when both stageId and stageValue are missing
                    const stageIdValue = typeof row.stageId === 'string' ? row.stageId.trim() : '';
                    const stageValueValue = typeof row.stageValue === 'string' ? row.stageValue.trim() : '';
                    if (!stageIdValue && !stageValueValue) {
                      const reason = 'Stage is required for deal import';
                      errors.push({
                        row: rowNumber,
                        field: 'stageId',
                        error: 'Stage is required for deal import',
                      });
                      summary.failed++;
                      continue; // Same continue as actual import
                    }
                    
                    // ЖЕСТКАЯ ВАЛИДАЦИЯ: title обязателен (same as actual import)
                    if (!row.title || row.title.trim() === '') {
                      const reason = 'Title is required for deal import';
                      errors.push({
                        row: rowNumber,
                        field: 'title',
                        error: 'Title is required for deal import',
                      });
                      summary.failed++;
                      continue; // Same continue as actual import
                    }
                    
                    // Pipeline is OPTIONAL - used only for soft validation of stageId
                    // If pipelineId is missing in row, use pipelineId from function parameter
                    // Pipeline object (for validation) is optional - import continues without it
                    const rowPipelineId = (row.pipelineId && typeof row.pipelineId === 'string' && row.pipelineId.trim()) 
                      ? row.pipelineId 
                      : (pipelineId && typeof pipelineId === 'string' && pipelineId.trim() ? pipelineId : undefined);
                    
                    // SOFT VALIDATION: If pipeline is loaded, validate that stageId belongs to pipeline
                    // This is soft validation - does NOT block import if validation fails
                    if (pipeline && row.stageId && pipeline.stages) {
                      const stageExists = pipeline.stages.some((s: any) => s.id === row.stageId);
                      if (!stageExists) {
                        // Soft validation warning - stageId may not belong to pipeline
                        // But import continues - this is a warning, not an error
                        warnings.push(`Row ${rowNumber}: Stage "${row.stageId}" may not belong to pipeline "${pipelineId}"`);
                      }
                    }
                    
                    // Все валидации пройдены - добавляем в dealsWithNumber (same as actual import)
                    // For dry-run, pipelineId can be undefined, so we use empty string as fallback for type compatibility
                    dealsWithNumber.push({
                      ...row,
                      number: row.number || `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate if missing
                      stageId: row.stageId, // НИКОГДА не передаем пустую строку
                      title: row.title, // НИКОГДА не передаем пустую строку
                      pipelineId: rowPipelineId || '', // Use row.pipelineId or fallback to function parameter (empty string for dry-run if missing)
                    });
                  }
                  
                  
                  // CRITICAL: In dry-run, simulate batchCreateDeals logic WITHOUT actual DB writes
                  // Check existing deals to determine created vs updated
                  const numbers = dealsWithNumber.map(d => d.number).filter((n): n is string => Boolean(n));
                  
                  let existingDeals = new Map<string, { id: string; number: string }>();
                  if (numbers.length > 0) {
                    try {
                      // Only read operation - safe for dry-run
                      existingDeals = await this.importBatchService.batchFindDealsByNumbers(numbers);
                    } catch (error) {
                      // CRITICAL: Log Prisma error with full details
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      const errorStack = error instanceof Error ? error.stack : 'N/A';
                      console.error('[IMPORT DEALS DRY RUN ERROR] Error checking existing deals (Prisma error):', {
                        error: errorMessage,
                        stack: errorStack,
                        errorType: error instanceof Error ? error.constructor.name : typeof error,
                        prismaError: error,
                        numbersCount: numbers.length,
                      });
                      // Add to errors and increase failed count
                      errors.push({
                        row: -1, // Global error for batch check
                        error: `Failed to check existing deals: ${errorMessage}`,
                      });
                      // CRITICAL: Increase failed count - this affects import accuracy
                      summary.failed += dealsWithNumber.length; // All deals in batch failed validation
                      // Continue without checking - but mark as failed
                    }
                  }
                  
                  // Simulate batchCreateDeals logic: count created vs updated
                  // This matches the real logic in batchCreateDeals
                  dealsWithNumber.forEach((deal) => {
                    if (deal.number && existingDeals.has(deal.number)) {
                      summary.updated++;
                    } else {
                      summary.created++;
                    }
                  });
                  
                } else {
                  // Log: Перед actual import
                  // Actual import - create/update deals
                  
                  // CRITICAL DEBUG: Check condition before actual import
                  
                  // Log: ПЕРЕД началом обработки строк в actual import
                  // Proceed with import
                  // CRITICAL: Validate stageId BEFORE adding to dealsWithNumber
                  // Filter out rows without valid stageId and add them to errors
                  let dealsWithNumber: Array<{
                        number: string;
                        title: string;
                        amount?: number | string | null;
                        budget?: number | string | null;
                        pipelineId: string;
                        stageId: string;
                        assignedToId?: string | null;
                        contactId?: string | null;
                        companyId?: string | null;
                        expectedCloseAt?: Date | string | null;
                        description?: string | null;
                        tags?: string[];
                        rejectionReasons?: string[];
                        reason?: string | null;
                      }> = [];
                  
                  // Store contact data for each deal (deal number -> contact data and CSV row index)
                  // validRows corresponds to processedRows, which corresponds to rows by index
                  const dealContactDataMap = new Map<string, { contactData: any; csvRowIndex: number }>();
                  
                  try {
                      for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
                        const row: any = validRows[rowIndex];
                        const rowNumber = rowIndex + 1;
                        
                        // validRows index corresponds to processedRows index, which corresponds to rows index
                        // Since processedRows is created sequentially from rows, the index should match
                        const csvRowIndex = rowIndex;
                        
                        // ЖЕСТКАЯ ВАЛИДАЦИЯ: stageId обязателен
                        if (!row.stageId || row.stageId.trim() === '') {
                          const reason = 'Stage is required for deal import';
                          errors.push({
                            row: rowNumber,
                            field: 'stageId',
                            error: 'Stage is required for deal import',
                          });
                          summary.failed++;
                          continue;
                        }
                        
                        // ЖЕСТКАЯ ВАЛИДАЦИЯ: title обязателен
                        if (!row.title || row.title.trim() === '') {
                          const reason = 'Title is required for deal import';
                          errors.push({
                            row: rowNumber,
                            field: 'title',
                            error: 'Title is required for deal import',
                          });
                          summary.failed++;
                          continue;
                        }
                        
                        // Pipeline ID: use row.pipelineId if present, otherwise use function parameter
                        // For actual import, pipelineId should always be set (validated in controller)
                        const rowPipelineId = (row.pipelineId && typeof row.pipelineId === 'string' && row.pipelineId.trim()) 
                          ? row.pipelineId 
                          : (pipelineId && typeof pipelineId === 'string' && pipelineId.trim() ? pipelineId : undefined);
                        
                        // For actual import, pipelineId is required
                        if (!rowPipelineId || typeof rowPipelineId !== 'string' || rowPipelineId.trim() === '') {
                          errors.push({
                            row: rowNumber,
                            field: 'pipelineId',
                            error: 'Pipeline ID is required for deal import',
                          });
                          summary.failed++;
                          continue;
                        }
                        
                        // CRITICAL: Resolve stageId using stagesMap (includes newly created stages)
                        // Also fix stageId if it doesn't belong to current pipeline
                        let resolvedStageId = row.stageId;
                        const stageValueStr = row.stageValue
                          ? (typeof row.stageValue === 'string' ? row.stageValue : String(row.stageValue || ''))
                          : '';
                        const normalizedStageName = stageValueStr.trim().toLowerCase();
                        
                        // Prefer stageValue if provided (even if stageId was prefilled with default)
                        if (normalizedStageName) {
                          for (const [name, id] of stagesMap.entries()) {
                            const nameStr = typeof name === 'string' ? name : String(name || '');
                            if (nameStr.toLowerCase().trim() === normalizedStageName) {
                              resolvedStageId = id;
                              break;
                            }
                          }
                          if (resolvedStageId) {
                          }
                        }
                        
                        if (pipeline && resolvedStageId && pipeline.stages) {
                          const stageExists = pipeline.stages.some((s: any) => s.id === resolvedStageId);
                          if (!stageExists) {
                            // StageId doesn't belong to current pipeline - need to resolve
                            
                            // Try to resolve by stageValue (stage name from CSV)
                            if (normalizedStageName) {
                              // First try stagesMap (includes created stages)
                              let foundStageId: string | undefined;
                              for (const [name, id] of stagesMap.entries()) {
                                const nameStr = typeof name === 'string' ? name : String(name || '');
                                if (nameStr.toLowerCase().trim() === normalizedStageName) {
                                  foundStageId = id;
                                  break;
                                }
                              }
                              
                              if (foundStageId) {
                                resolvedStageId = foundStageId;
                              } else {
                                // No matching stage found - use default stage
                                if (defaultStageId) {
                                  resolvedStageId = defaultStageId;
                                  warnings.push(`Row ${rowNumber}: Stage "${row.stageValue}" not found in pipeline, using default stage`);
                                } else {
                                  console.error(`[IMPORT STAGE FIX] Row ${rowNumber}: Cannot resolve stage - no matching stage and no default stage`);
                                  errors.push({
                                    row: rowNumber,
                                    error: `Stage "${row.stageValue}" not found in pipeline and no default stage available`,
                                  });
                                  summary.failed++;
                                  continue;
                                }
                              }
                            } else {
                              // No stageValue - use default stage
                              if (defaultStageId) {
                                resolvedStageId = defaultStageId;
                                warnings.push(`Row ${rowNumber}: Stage "${row.stageId}" doesn't belong to pipeline, using default stage`);
                              } else {
                                console.error(`[IMPORT STAGE FIX] Row ${rowNumber}: Cannot resolve stage - no stageValue and no default stage`);
                                errors.push({
                                  row: rowNumber,
                                  error: `Stage "${row.stageId}" doesn't belong to pipeline and no default stage available`,
                                });
                                summary.failed++;
                                continue;
                              }
                            }
                          }
                        }
                        
                        // Все валидации пройдены - добавляем в dealsWithNumber
                        // CRITICAL: Include ALL fields from mapDealRow, not just number, stageId, title, pipelineId
                        const dealToCreate: any = {
                          number: row.number || `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate if missing
                          title: row.title, // НИКОГДА не передаем пустую строку
                          amount: row.amount !== undefined ? row.amount : null,
                          budget: row.budget !== undefined ? row.budget : null,
                          pipelineId: rowPipelineId, // Use row.pipelineId or fallback to function parameter (always string here)
                          stageId: resolvedStageId, // Use resolved stageId (may be fixed if it didn't belong to pipeline)
                          assignedToId: row.assignedToId !== undefined ? row.assignedToId : null,
                          contactId: row.contactId !== undefined ? row.contactId : null,
                          companyId: row.companyId !== undefined ? row.companyId : null,
                          expectedCloseAt: row.expectedCloseAt !== undefined ? row.expectedCloseAt : null,
                          description: row.description !== undefined ? row.description : null,
                          tags: row.tags !== undefined ? row.tags : undefined,
                          rejectionReasons: row.rejectionReasons !== undefined ? row.rejectionReasons : undefined,
                          reason: row.reason !== undefined ? row.reason : null,
                          customFields: row.customFields !== undefined ? row.customFields : undefined,
                        };
                        
                        
                        dealsWithNumber.push(dealToCreate);
                        
                        // Store contact data for this deal if contact fields are present
                        const hasContactFields = mapping.email || mapping.phone || mapping.fullName || 
                                                 mapping.contactMethods || mapping.directions || mapping.link ||
                                                 mapping.subscriberCount || mapping.websiteOrTgChannel || 
                                                 mapping.contactInfo || mapping.position || mapping.companyName ||
                                                 mapping.notes || mapping.social;
                        
                        if (hasContactFields) {
                          // Find corresponding processedRow to get original CSV row index
                          const processedRow = processedRows.find(r => r.title === row.title && r.stageId === row.stageId);
                          if (processedRow) {
                            // processedRows are created sequentially from rows, so we can use findIndex
                            const processedRowIndex = processedRows.indexOf(processedRow);
                            if (processedRowIndex >= 0 && processedRowIndex < rows.length) {
                              const csvRow = rows[processedRowIndex];
                              
                              // Trim row values
                              const trimmedRow: Record<string, string> = {};
                              for (const [key, value] of Object.entries(csvRow)) {
                                if (value && typeof value === 'string') {
                                  trimmedRow[key] = value.trim();
                                } else {
                                  trimmedRow[key] = value || '';
                                }
                              }
                              
                              // Extract contact fields
                              const contactData = this.mapContactFieldsFromDealRow(trimmedRow, mapping, processedRowIndex + 1, errors);
                              if (contactData) {
                                dealContactDataMap.set(dealToCreate.number, {
                                  contactData,
                                  csvRowIndex: processedRowIndex,
                                });
                              }
                            }
                          }
                        }
                      }
                      
                      
                      const result = await this.importBatchService.batchCreateDeals(dealsWithNumber, userId);
                      
                      
                      summary.created += result.created;
                      summary.updated += result.updated;
                      summary.failed += result.errors.length;
                      
                      // CRITICAL: After creating deals, create contacts for each deal if contact fields are present
                      // Check if mapping contains contact fields
                      const hasContactFields = mapping.email || mapping.phone || mapping.fullName || 
                                               mapping.contactMethods || mapping.directions || mapping.link ||
                                               mapping.subscriberCount || mapping.websiteOrTgChannel || 
                                               mapping.contactInfo || mapping.position || mapping.companyName ||
                                               mapping.notes || mapping.social;
                      
                      if (hasContactFields && dealsWithNumber.length > 0) {
                        
                        // Find created deals by numbers
                        const dealNumbers = dealsWithNumber.map(d => d.number).filter((n): n is string => Boolean(n));
                        const createdDealsMap = await this.importBatchService.batchFindDealsByNumbers(dealNumbers);
                        
                        // CRITICAL: Collect all directions and contactMethods from contact data for updating system options
                        const allDirectionsFromDeals = new Set<string>();
                        const allContactMethodsFromDeals = new Set<string>();
                        
                        
                        // Create contacts for each deal
                        for (const [dealNumber, { contactData, csvRowIndex }] of dealContactDataMap.entries()) {
                          try {
                            const deal = createdDealsMap.get(dealNumber);
                            if (!deal) continue;
                            
                            // Collect directions and contactMethods for system options update
                            
                            if (contactData.directions && Array.isArray(contactData.directions) && contactData.directions.length > 0) {
                              contactData.directions.forEach((direction) => {
                                if (direction && typeof direction === 'string' && direction.trim()) {
                                  allDirectionsFromDeals.add(direction.trim());
                                }
                              });
                            }
                            if (contactData.contactMethods && Array.isArray(contactData.contactMethods) && contactData.contactMethods.length > 0) {
                              contactData.contactMethods.forEach((method) => {
                                if (method && typeof method === 'string' && method.trim()) {
                                  allContactMethodsFromDeals.add(method.trim());
                                }
                              });
                            }
                            
                            // Generate fullName if missing (required by Prisma schema)
                            const fullName = contactData.fullName || 
                                           contactData.email || 
                                           contactData.phone || 
                                           `Contact for deal ${dealNumber}`;
                            
                            // Create contact
                            const contact = await this.prisma.contact.create({
                              data: {
                                fullName: sanitizeTextFields(fullName)!,
                                email: contactData.email || undefined,
                                phone: contactData.phone || undefined,
                                position: contactData.position || undefined,
                                companyName: contactData.companyName || undefined,
                                companyId: contactData.companyId || undefined,
                                tags: contactData.tags || [],
                                notes: contactData.notes || undefined,
                                social: contactData.social || {},
                                link: contactData.link || undefined,
                                subscriberCount: contactData.subscriberCount || undefined,
                                directions: contactData.directions || [],
                                contactMethods: contactData.contactMethods || [],
                                websiteOrTgChannel: contactData.websiteOrTgChannel || undefined,
                                contactInfo: contactData.contactInfo || undefined,
                              },
                            });
                            
                            // Update deal with contactId
                            await this.prisma.deal.update({
                              where: { id: deal.id },
                              data: { contactId: contact.id },
                            });
                            
                            // CRITICAL: Also collect directions and contactMethods from the created contact
                            // This ensures we get the actual values that were saved to the database
                            if (contact.directions && Array.isArray(contact.directions) && contact.directions.length > 0) {
                              contact.directions.forEach((direction) => {
                                if (direction && typeof direction === 'string' && direction.trim()) {
                                  allDirectionsFromDeals.add(direction.trim());
                                }
                              });
                            }
                            if (contact.contactMethods && Array.isArray(contact.contactMethods) && contact.contactMethods.length > 0) {
                              contact.contactMethods.forEach((method) => {
                                if (method && typeof method === 'string' && method.trim()) {
                                  allContactMethodsFromDeals.add(method.trim());
                                }
                              });
                            }
                            
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            console.error(`[IMPORT CONTACT ERROR] Failed to create contact for deal ${dealNumber}:`, errorMessage);
                            errors.push({
                              row: csvRowIndex + 1,
                              error: `Failed to create contact: ${errorMessage}`,
                            });
                          }
                        }
                        
                        // CRITICAL: Update system field options with directions and contactMethods from contacts created during deal import
                        
                        if (allDirectionsFromDeals.size > 0) {
                          try {
                            const updatedOptions = await this.systemFieldOptionsService.addOptionsIfMissing(
                              'contact',
                              'directions',
                              Array.from(allDirectionsFromDeals),
                            );
                          } catch (error) {
                            console.error('[IMPORT DEALS] Failed to update directions options from contacts:', error);
                            // Don't fail the import if options update fails
                          }
                        } else {
                        }
                        
                        if (allContactMethodsFromDeals.size > 0) {
                          try {
                            const updatedOptions = await this.systemFieldOptionsService.addOptionsIfMissing(
                              'contact',
                              'contactMethods',
                              Array.from(allContactMethodsFromDeals),
                            );
                          } catch (error) {
                            console.error('[IMPORT DEALS] Failed to update contactMethods options from contacts:', error);
                            // Don't fail the import if options update fails
                          }
                        } else {
                        }
                      }
                      

                      result.errors.forEach((err) => {
                        errors.push({
                          row: err.row >= 0 ? err.row : -1,
                          error: err.error,
                        });
                      });
                    } catch (error) {
                      // CRITICAL: Log Prisma error with full details
                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                      const errorStack = error instanceof Error ? error.stack : 'N/A';
                      console.error('[IMPORT DEALS ERROR] Batch create failed (Prisma error):', {
                        error: errorMessage,
                        stack: errorStack,
                        errorType: error instanceof Error ? error.constructor.name : typeof error,
                        prismaError: error,
                        dealsWithNumberCount: dealsWithNumber?.length || 0,
                        validRowsCount: validRows.length,
                        sampleDeal: dealsWithNumber?.[0] ? {
                          number: dealsWithNumber[0].number,
                          title: dealsWithNumber[0].title,
                          pipelineId: dealsWithNumber[0].pipelineId,
                          stageId: dealsWithNumber[0].stageId,
                        } : null,
                      });
                      // CRITICAL: Add to globalErrors and increase failed count
                      globalErrors.push(`Batch import failed: ${errorMessage}`);
                      // CRITICAL: Add each deal to errors for detailed reporting
                      if (dealsWithNumber) {
                        dealsWithNumber.forEach((deal, index) => {
                          errors.push({
                            row: index + 1,
                            error: `Failed to import deal: ${errorMessage}`,
                          });
                        });
                        // CRITICAL: Increase failed count for all deals in failed batch
                        summary.failed += dealsWithNumber.length;
                      } else {
                        // If dealsWithNumber is not defined, mark all processedRows as failed
                        summary.failed += processedRows.length;
                      }
                  }
                }
              } else {
                // validRows.length === 0 - no valid rows to import
                console.warn('[IMPORT DEALS] No valid rows to import:', {
                  updatedRowsCount: updatedRows.length,
                  validRowsCount: validRows.length,
                  defaultStageId,
                  dryRun,
                  sampleUpdatedRow: updatedRows[0] ? {
                    hasStageId: !!updatedRows[0].stageId,
                    hasStageValue: !!updatedRows[0].stageValue,
                    stageId: updatedRows[0].stageId,
                    stageValue: updatedRows[0].stageValue,
                    title: updatedRows[0].title,
                  } : null,
                });
                if (!dryRun) {
                  globalErrors.push('No valid rows to import. All rows are missing required stage information.');
                  summary.failed = updatedRows.length;
                }
              }
              
              // Return result
              const result: ImportResultDto = {
                summary,
                errors,
                globalErrors: globalErrors.length > 0 ? globalErrors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
                stagesToCreate: stagesToCreate.length > 0 ? stagesToCreate : undefined,
              };
              
              // Log import context for debugging
              
              // Log final result before return
              
              // CRITICAL: Invariant check for actual import
              // If validRows.length > 0, result CANNOT be all zeros
              if (!dryRun && validRows.length > 0) {
                const isAllZeros = summary.created === 0 && summary.updated === 0 && summary.failed === 0;
                if (isAllZeros) {
                  // CRITICAL ERROR: Silent failure detected
                  const errorMessage = 'CRITICAL: Import invariant violation - validRows exist, but result is all zeros (created=0, updated=0, failed=0). This indicates a silent failure.';
                  console.error('[IMPORT DEALS CRITICAL ERROR] Invariant violation detected:', {
                    error: errorMessage,
                    validRowsCount: validRows.length,
                    summary: {
                      created: summary.created,
                      updated: summary.updated,
                      failed: summary.failed,
                      skipped: summary.skipped,
                      total: summary.total,
                    },
                    processedRowsCount: processedRows.length,
                    updatedRowsCount: updatedRows.length,
                    sampleValidRow: validRows[0] ? {
                      title: validRows[0].title,
                      pipelineId: validRows[0].pipelineId,
                      stageId: validRows[0].stageId,
                    } : null,
                    checkDetails: {
                      condition: 'validRows.length > 0',
                      actualValidRows: validRows.length,
                      actualResult: `created=${summary.created}, updated=${summary.updated}, failed=${summary.failed}`,
                    },
                  });
                  // CRITICAL: Add to globalErrors with explicit reason
                  globalErrors.push(errorMessage);
                  globalErrors.push('Possible causes: batchCreateDeals was not called, all rows were filtered out after validation, or batchCreateDeals returned 0 for all rows.');
                  globalErrors.push(`Invariant check: validRows.length=${validRows.length}, result=all zeros`);
                  // CRITICAL: Mark all validRows as failed
                  summary.failed += validRows.length;
                  // Add errors for each validRow
                  validRows.forEach((row, index) => {
                    errors.push({
                      row: index + 1,
                      error: 'Import invariant violation: row was processed but no result was recorded',
                    });
                  });
                  // Update result with corrected summary
                  result.summary = summary;
                  result.globalErrors = globalErrors.length > 0 ? globalErrors : undefined;
                  result.errors = errors;
                }
              }
              
              if (dryRun) {
              } else {
                // Log: В КОНЦЕ функции перед return для actual import
              }
              
              return result;
            } else {
              // No rows to process
              const result: ImportResultDto = {
                summary,
                errors,
                globalErrors: globalErrors.length > 0 ? globalErrors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
                stagesToCreate: stagesToCreate.length > 0 ? stagesToCreate : undefined,
              };
              
              // Log import context for debugging
              
              // Log final result before return (no rows case)
              
              if (dryRun) {
              } else {
                // Log: В КОНЦЕ функции перед return для actual import (no rows case)
              }
              
              return result;
            }
          } catch (error) {
            // CRITICAL: Log Prisma error with full details
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorStack = error instanceof Error ? error.stack : 'N/A';
            console.error('[IMPORT DEALS ERROR] Error processing stages and deals (Prisma error):', {
              error: errorMessage,
              stack: errorStack,
              errorType: error instanceof Error ? error.constructor.name : typeof error,
              prismaError: error,
              processedRowsCount: processedRows.length,
              dryRun,
            });
            
            if (dryRun) {
              // In dry-run, return errors in result instead of throwing
              globalErrors.push(`Processing error: ${errorMessage}`);
              // CRITICAL: Increase failed count for all processed rows
              summary.failed += processedRows.length;
              // Add errors for each processed row
              processedRows.forEach((row, index) => {
                errors.push({
                  row: index + 1,
                  error: `Processing failed: ${errorMessage}`,
                });
              });
              const result: ImportResultDto = {
                summary,
                errors,
                globalErrors: globalErrors.length > 0 ? globalErrors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
              };
              return result;
            } else {
              // In actual import, throw for global exception filter
            if (error instanceof BadRequestException) {
                throw error;
              } else {
                throw new BadRequestException(`Import error: ${errorMessage}`);
              }
            }
          }
        } catch (error) {
      // CRITICAL: Log Prisma error with full details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'N/A';
      console.error('[IMPORT DEALS ERROR] Top-level catch (Prisma error):', {
        error: errorMessage,
        stack: errorStack,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        prismaError: error,
        rowsCount: rows?.length || 0,
        dryRun,
      });
      
      if (dryRun) {
        // In dry-run, return errors in result instead of throwing
        const result: ImportResultDto = {
          summary: {
            total: rows?.length || 0,
            created: 0,
            updated: 0,
            failed: rows?.length || 0, // CRITICAL: Mark all rows as failed
            skipped: 0,
          },
          errors: rows ? rows.map((_, index) => ({
            row: index + 1,
            error: `Import failed: ${errorMessage}`,
          })) : [],
          globalErrors: [`Import error: ${errorMessage}`],
        };
        return result;
            } else {
        // For actual import, throw with detailed message in development mode
        const isDevelopment = process.env.NODE_ENV !== 'production';
        if (isDevelopment) {
          throw new HttpException(
            `Import failed: ${errorMessage}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        } else {
          throw new BadRequestException('Import failed');
        }
      }
    }
  }

  /**
   * Маппинг CSV строки в данные контакта
   */
  private mapContactRow(
    csvRow: Record<string, string>,
    mapping: ContactFieldMapping,
    rowNumber: number,
    errors: ImportError[],
  ): {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    companyName?: string | null;
    companyId?: string | null;
    tags?: string[];
    notes?: string | null;
    social?: any;
    link?: string | null;
    subscriberCount?: string | null;
    directions?: string[];
    contactMethods?: string[];
    websiteOrTgChannel?: string | null;
    contactInfo?: string | null;
  } | null {
    // Получаем значение из CSV по маппингу
    const getValue = (fieldName?: string): string | undefined => {
      if (!fieldName) return undefined;

      const value = csvRow[fieldName];
      
      // Безопасная обработка значения - только строки могут иметь trim()
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Преобразуем в строку если это не строка
      const stringValue = typeof value === 'string' ? value : String(value);
      
      // trim() только для строк
      return stringValue.trim() || undefined;
    };

    // Number опционален (только для deals, не для contacts)
    // const numberValue = getValue(mapping.number); // Removed - number is not in ContactFieldMapping

    // FullName опционален
    const fullNameValue = getValue(mapping.fullName);
    const fullName = fullNameValue ? sanitizeTextFields(fullNameValue) : null;



    // Email и phone - хотя бы один должен быть
    const emailValue = getValue(mapping.email);
    const phoneValue = getValue(mapping.phone);

    if (!emailValue && !phoneValue) {
      errors.push({
        row: rowNumber,
        error: 'Either email or phone must be provided',
      });
      return null;
    }



    // Нормализация email и phone
    const normalizedEmail = emailValue ? normalizeEmail(emailValue) : null;
    const normalizedPhone = phoneValue ? normalizePhone(phoneValue) : null;

    if (emailValue && !normalizedEmail) {
      errors.push({
        row: rowNumber,
        field: 'email',
        value: emailValue,
        error: 'Invalid email format',
      });
    }



    if (phoneValue && !normalizedPhone) {
      errors.push({
        row: rowNumber,
        field: 'phone',
        value: phoneValue,
        error: 'Invalid phone format',
      });
    }



    // Парсинг tags (разделенные запятой)
    const tags: string[] = [];
    if (mapping.tags) {
      const tagsValue = getValue(mapping.tags);
      if (tagsValue) {
        tags.push(...tagsValue.split(',').map((t) => t.trim()).filter(Boolean));
      }
    }



    // Social links
    let social: any = undefined;
    if (mapping.social) {
      const socialData: any = {};
      if (mapping.social.instagram) {
        const instagram = getValue(mapping.social.instagram);
        if (instagram) socialData.instagram = instagram;
      }
      if (mapping.social.telegram) {
        const telegram = getValue(mapping.social.telegram);
        if (telegram) socialData.telegram = telegram;
      }
      if (mapping.social.whatsapp) {
        const whatsapp = getValue(mapping.social.whatsapp);
        if (whatsapp) socialData.whatsapp = whatsapp;
      }
      if (mapping.social.vk) {
        const vk = getValue(mapping.social.vk);
        if (vk) socialData.vk = vk;
      }
      if (mapping.social.linkedin) {
        const linkedin = getValue(mapping.social.linkedin);
        if (linkedin) socialData.linkedin = linkedin;
      }

      if (Object.keys(socialData).length > 0) {
        social = normalizeSocialLinks(socialData);
      }
    }



    // Новые поля
    const link = sanitizeOptionalTextFields(getValue(mapping.link));
    const subscriberCount = sanitizeOptionalTextFields(getValue(mapping.subscriberCount));
    const websiteOrTgChannel = sanitizeOptionalTextFields(getValue(mapping.websiteOrTgChannel));
    const contactInfo = sanitizeOptionalTextFields(getValue(mapping.contactInfo));

    // Парсинг directions (разделенные запятой)
    const directions: string[] = [];
    if (mapping.directions) {
      const directionsValue = getValue(mapping.directions);
      if (directionsValue) {
        directions.push(...directionsValue.split(',').map((d) => d.trim()).filter(Boolean));
      }
    }



    // Парсинг contactMethods (разделенные запятой)
    const contactMethods: string[] = [];
    if (mapping.contactMethods) {
      const methodsValue = getValue(mapping.contactMethods);
      if (methodsValue) {
        contactMethods.push(...methodsValue.split(',').map((m) => m.trim()).filter(Boolean));
      }
    }



    return {
      fullName,
      email: normalizedEmail || undefined,
      phone: normalizedPhone || undefined,
      position: sanitizeOptionalTextFields(getValue(mapping.position)),
      companyName: sanitizeOptionalTextFields(getValue(mapping.companyName)),
      companyId: getValue(mapping.companyId) || undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: sanitizeOptionalTextFields(getValue(mapping.notes)),
      social: social || undefined,
      link: link || undefined,
      subscriberCount: subscriberCount || undefined,
      directions: directions.length > 0 ? directions : undefined,
      contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
      websiteOrTgChannel: websiteOrTgChannel || undefined,
      contactInfo: contactInfo || undefined,
    };
  }

  /**
   * Маппинг CSV строки в данные сделки
   */
  private mapDealRow(
    csvRow: Record<string, string>,
    mapping: DealFieldMapping,
    rowNumber: number,
    errors: ImportError[],
    pipelineId: string | undefined, // Optional - may be undefined for dry-run
    stagesMap: Map<string, string>, // stageName -> stageId
    usersMap: Map<string, string>, // userName/email -> userId
    defaultAssignedToId?: string,
    contactEmailPhoneMap?: Map<string, string>,
    csvStagesMap?: Map<string, number>, // stageName -> firstRowNumber (для сбора стадий из CSV)
    userValueMapping?: Record<string, string>, // Manual mapping: { "CSV value": "user-id" }
  ): {
    number?: string;
    title: string;
    amount?: number | string | null;
    budget?: number | string | null;
    pipelineId: string | undefined; // Optional - may be undefined for dry-run
    stageId?: string;
    stageValue?: string; // Оригинальное значение стадии из CSV
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    expectedCloseAt?: Date | string | null;
    description?: string | null;
    tags?: string[];
    rejectionReasons?: string[];
    reason?: string | null;
    customFields?: Record<string, any>;
  } | null {
    const getValue = (fieldName?: string): string | undefined => {
      if (!fieldName) return undefined;

      const value = csvRow[fieldName];
      
      // Безопасная обработка значения - только строки могут иметь trim()
      if (value === null || value === undefined) {
        return undefined;
      }
      
      // Преобразуем в строку если это не строка
      const stringValue = typeof value === 'string' ? value : String(value);
      
      // trim() только для строк
      return stringValue.trim() || undefined;
    };

    // Number опционален
    const numberValue = getValue(mapping.number);

    // Title обязателен
    const titleValue = getValue(mapping.title);
    if (!titleValue) {
      errors.push({
        row: rowNumber,
        field: 'title',
        error: 'Deal title is required',
      });
      return null;
    }



    // StageId опционален - резолвится по имени если указан
    // БЕЗОПАСНОЕ получение стадии из CSV
    const rawStage = mapping.stageId ? csvRow[mapping.stageId] : null;
    
    const stageName =
      typeof rawStage === 'string' && rawStage.trim()
        ? rawStage.trim()
        : null;
    
    let stageId: string | undefined = undefined;

    if (stageName) {
      // Нормализуем имя стадии (trim + lowercase для сравнения)
      const normalizedStageName = stageName.toLowerCase();
      const originalStageName = stageName; // Сохраняем оригинальное имя
      
      // Всегда сохраняем stageName в csvStagesMap для сбора всех стадий из CSV
      // Используем оригинальное имя (не нормализованное) для сохранения регистра
      if (csvStagesMap) {
        // Проверяем по нормализованному имени, но сохраняем оригинальное
        let foundOriginalName = originalStageName;
        for (const [name] of csvStagesMap.entries()) {
          // Безопасная обработка name - проверяем что это строка
          const nameStr = typeof name === 'string' ? name : String(name || '');
          if (nameStr.toLowerCase() === normalizedStageName) {
            foundOriginalName = nameStr; // Используем уже сохраненное имя
            break;
          }
        }
        if (!csvStagesMap.has(foundOriginalName)) {
          csvStagesMap.set(foundOriginalName, rowNumber);
        }
      }
      
      // Резолвим stage ID по имени (case-insensitive, trim)
      // Сначала пробуем найти по точному совпадению ID
      if (stagesMap.has(stageName)) {
        // Это уже ID стадии
        stageId = stagesMap.get(stageName)!;
      } else {
        // Если не ID, ищем по имени (case-insensitive, trim)
        let foundStageId: string | undefined;
        
        const entries = Array.from(stagesMap.entries());
        for (const [name, id] of entries) {
          // Безопасная обработка name - проверяем что это строка
          const nameStr = typeof name === 'string' ? name : String(name || '');
          if (nameStr.toLowerCase().trim() === normalizedStageName) {
            foundStageId = id;
            break;
          }
        }
        
        if (foundStageId) {
          stageId = foundStageId;
        } else {
          // Stage указан но не найден - сохраняем для возможного создания
          // Не добавляем ошибку - стадия будет создана при импорте
          // stageId остается undefined, но stageName сохраняется в stageValue
        }
      }
    }
    // Если stageName === null - используем дефолтную стадию pipeline (если есть) или пропускаем установку stage



    // Резолв contactId через email/phone если указан в mapping
    let contactId: string | undefined = undefined;
    if (mapping.contactId) {
      // Если contactId указан напрямую в CSV
      contactId = getValue(mapping.contactId);
    } else if (contactEmailPhoneMap) {
      // Пытаемся найти contactId по email или phone
      const contactEmail = getValue(mapping.email);
      const contactPhone = getValue(mapping.phone);

      if (contactEmail) {
        const normalizedEmail = normalizeEmail(contactEmail);
        if (normalizedEmail && contactEmailPhoneMap.has(`email:${normalizedEmail}`)) {
          contactId = contactEmailPhoneMap.get(`email:${normalizedEmail}`)!;
        }
      }

      if (!contactId && contactPhone) {
        const normalizedPhone = normalizePhone(contactPhone);
        if (normalizedPhone && contactEmailPhoneMap.has(`phone:${normalizedPhone}`)) {
          contactId = contactEmailPhoneMap.get(`phone:${normalizedPhone}`)!;
        }
      }
    }



    // Парсинг даты
    let expectedCloseAt: Date | null = null;
    if (mapping.expectedCloseAt) {
      const dateValue = getValue(mapping.expectedCloseAt);
      if (dateValue) {
        const parsedDate = new Date(dateValue);
        if (isNaN(parsedDate.getTime())) {
          errors.push({
            row: rowNumber,
            field: 'expectedCloseAt',
            value: dateValue,
            error: 'Invalid date format',
          });
        } else {
          expectedCloseAt = parsedDate;
        }
      }
    }



    // Парсинг tags
    const tags: string[] = [];
    if (mapping.tags) {
      const tagsValue = getValue(mapping.tags);
      if (tagsValue) {
        tags.push(...tagsValue.split(',').map((t) => t.trim()).filter(Boolean));
      }
    }



    // Резолв assignedToId/ownerId по имени/email или использование дефолтного
    let assignedToId: string | null = null;
    
    // Приоритет: ownerId > assignedToId > defaultAssignedToId
    const ownerField = mapping.ownerId || mapping.assignedToId;
    const ownerFieldName = mapping.ownerId ? 'ownerId' : 'assignedToId';
    
    if (defaultAssignedToId && !ownerField) {
      // Если указан дефолтный ответственный и нет маппинга, используем его для всех строк
      assignedToId = defaultAssignedToId;
    } else if (ownerField) {
      const ownerValue = getValue(ownerField);
      if (ownerValue) {
        let foundUserId: string | undefined;
        
        // Priority 1: Check manual userValueMapping first (exact match, case-sensitive)
        if (userValueMapping && userValueMapping[ownerValue]) {
          foundUserId = userValueMapping[ownerValue];
        }
        
        // Priority 2: Try automatic resolution by email OR fullName (case-insensitive)
        if (!foundUserId) {
          const lookupValue = ownerValue.toLowerCase().trim();
          
          // Try exact match first (email:xxx or name:xxx)
          for (const [key, id] of usersMap.entries()) {
            const keyLower = key.toLowerCase();
            if (keyLower === `email:${lookupValue}` || keyLower === `name:${lookupValue}`) {
              foundUserId = id;
              break;
            }
          }
          
          // If not found, try partial match (email or name part)
          if (!foundUserId) {
            for (const [key, id] of usersMap.entries()) {
              const keyLower = key.toLowerCase();
              const keyValue = keyLower.split(':')[1] || '';
              if (keyValue === lookupValue) {
                foundUserId = id;
                break;
              }
            }
          }
        }
        
        if (foundUserId) {
          assignedToId = foundUserId;
        } else {
          // Owner not found - warning, not fatal error
          // Deal will be created without assignment
          // Don't add error - just log warning (not blocking)
          console.warn(`[ROW ${rowNumber}] Owner "${ownerValue}" not found. Deal will be created without assignment.`);
        }
      } else if (defaultAssignedToId) {
        // Если ownerField пустой для этой строки, используем дефолт
        assignedToId = defaultAssignedToId;
      }
    }



    // Парсинг rejectionReasons (разделенные запятой)
    const rejectionReasons: string[] = [];
    
    if (mapping.rejectionReasons) {
      const reasonsValue = getValue(mapping.rejectionReasons);
      
      if (reasonsValue) {
        const parsedReasons = reasonsValue.split(',').map((r) => r.trim()).filter(Boolean);
        rejectionReasons.push(...parsedReasons);
      } else {
      }
    } else {
    }
    



    // Парсинг reason (причина/основание)
    const reasonValue = getValue(mapping.reason);

    // Парсинг кастомных полей
    const customFields: Record<string, any> = {};
    if (mapping.customFields) {
      for (const [customFieldKey, csvColumnName] of Object.entries(mapping.customFields)) {
        if (csvColumnName && csvRow[csvColumnName] !== undefined) {
          const value = csvRow[csvColumnName];
          if (value && value.trim()) {
            customFields[customFieldKey] = value.trim();
          }
        }
      }
    }

    const result = {
      number: numberValue,
      title: titleValue,
      amount: getValue(mapping.amount) || null,
      budget: getValue(mapping.budget) || null,
      pipelineId,
      stageId,
      stageValue: stageName || undefined, // Сохраняем оригинальное значение для создания стадий
      assignedToId,
      contactId: contactId || null,
      companyId: getValue(mapping.companyId) || null,
      expectedCloseAt: expectedCloseAt || null,
      description: sanitizeOptionalTextFields(getValue(mapping.description)) || null,
      tags: tags.length > 0 ? tags : undefined,
      rejectionReasons: rejectionReasons.length > 0 ? rejectionReasons : undefined,
      reason: reasonValue || null,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };
    
    
    return result;
  }

  /**
   * Извлечение полей контакта из CSV строки при импорте сделок
   * Используется для создания/обновления контакта, связанного со сделкой
   */
  private mapContactFieldsFromDealRow(
    csvRow: Record<string, string>,
    mapping: DealFieldMapping,
    rowNumber: number,
    errors: ImportError[],
  ): {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    companyName?: string | null;
    companyId?: string | null;
    tags?: string[];
    notes?: string | null;
    social?: any;
    link?: string | null;
    subscriberCount?: string | null;
    directions?: string[];
    contactMethods?: string[];
    websiteOrTgChannel?: string | null;
    contactInfo?: string | null;
  } | null {
    
    const getValue = (fieldName?: string): string | undefined => {
      if (!fieldName) return undefined;
      const value = csvRow[fieldName];
      if (value === null || value === undefined) {
        return undefined;
      }
      const stringValue = typeof value === 'string' ? value : String(value);
      return stringValue.trim() || undefined;
    };

    // Нормализация email и phone (если есть)
    const emailValue = getValue(mapping.email);
    const phoneValue = getValue(mapping.phone);
    
    let normalizedEmail: string | null = null;
    let normalizedPhone: string | null = null;

    if (emailValue) {
      normalizedEmail = normalizeEmail(emailValue);
      if (!normalizedEmail) {
        errors.push({
          row: rowNumber,
          field: 'email',
          value: emailValue,
          error: 'Invalid email format',
        });
      }
    }

    if (phoneValue) {
      normalizedPhone = normalizePhone(phoneValue);
      if (!normalizedPhone) {
        errors.push({
          row: rowNumber,
          field: 'phone',
          value: phoneValue,
          error: 'Invalid phone format',
        });
      }
    }

    // Парсинг tags
    const tags: string[] = [];
    if (mapping.tags) {
      const tagsValue = getValue(mapping.tags);
      if (tagsValue) {
        tags.push(...tagsValue.split(',').map((t) => t.trim()).filter(Boolean));
      }
    }

    // Social links
    let social: any = undefined;
    if (mapping.social) {
      const socialData: any = {};
      if (mapping.social.instagram) {
        const instagram = getValue(mapping.social.instagram);
        if (instagram) socialData.instagram = instagram;
      }
      if (mapping.social.telegram) {
        const telegram = getValue(mapping.social.telegram);
        if (telegram) socialData.telegram = telegram;
      }
      if (mapping.social.whatsapp) {
        const whatsapp = getValue(mapping.social.whatsapp);
        if (whatsapp) socialData.whatsapp = whatsapp;
      }
      if (mapping.social.vk) {
        const vk = getValue(mapping.social.vk);
        if (vk) socialData.vk = vk;
      }
      if (mapping.social.linkedin) {
        const linkedin = getValue(mapping.social.linkedin);
        if (linkedin) socialData.linkedin = linkedin;
      }

      if (Object.keys(socialData).length > 0) {
        social = normalizeSocialLinks(socialData);
      }
    }

    // Парсинг directions (разделенные запятой)
    const directions: string[] = [];
    if (mapping.directions) {
      const directionsValue = getValue(mapping.directions);
      if (directionsValue) {
        const parsed = directionsValue.split(',').map((d) => d.trim()).filter(Boolean);
        directions.push(...parsed);
      } else {
      }
    } else {
    }

    // Парсинг contactMethods (разделенные запятой)
    const contactMethods: string[] = [];
    if (mapping.contactMethods) {
      const methodsValue = getValue(mapping.contactMethods);
      if (methodsValue) {
        contactMethods.push(...methodsValue.split(',').map((m) => m.trim()).filter(Boolean));
      }
    }

    // Check if we have at least one field to create contact
    const hasAnyContactField = normalizedEmail || normalizedPhone || getValue(mapping.fullName) ||
                               contactMethods.length > 0 || directions.length > 0 ||
                               getValue(mapping.link) || getValue(mapping.subscriberCount) ||
                               getValue(mapping.websiteOrTgChannel) || getValue(mapping.contactInfo) ||
                               getValue(mapping.position) || getValue(mapping.companyName) ||
                               getValue(mapping.notes) || social;
    
    
    if (!hasAnyContactField) {
      // No contact fields - don't create contact
      return null;
    }

    const result = {
      fullName: sanitizeTextFields(getValue(mapping.fullName)) || null,
      email: normalizedEmail || null,
      phone: normalizedPhone || null,
      position: sanitizeOptionalTextFields(getValue(mapping.position)) || null,
      companyName: sanitizeOptionalTextFields(getValue(mapping.companyName)) || null,
      companyId: getValue(mapping.companyId) || undefined,
      tags: tags.length > 0 ? tags : undefined,
      notes: sanitizeOptionalTextFields(getValue(mapping.notes)) || null,
      social: social || undefined,
      link: sanitizeOptionalTextFields(getValue(mapping.link)) || null,
      subscriberCount: sanitizeOptionalTextFields(getValue(mapping.subscriberCount)) || null,
      directions: directions.length > 0 ? directions : undefined,
      contactMethods: contactMethods.length > 0 ? contactMethods : undefined,
      websiteOrTgChannel: sanitizeOptionalTextFields(getValue(mapping.websiteOrTgChannel)) || null,
      contactInfo: sanitizeOptionalTextFields(getValue(mapping.contactInfo)) || null,
    };
    
    
    return result;
  }

  /**
   * Загрузка map стадий для pipeline (stageName -> stageId)
   */
  private async loadPipelineStagesMap(pipelineId: string): Promise<Map<string, string>> {
    // Валидация pipelineId перед запросом к БД
    if (!pipelineId || typeof pipelineId !== 'string' || pipelineId.trim() === '') {
      throw new BadRequestException('pipelineId is required and must be a non-empty string');
    }

    const pipelineFindPayload = {
      where: { id: pipelineId },
      include: {
        stages: true,
      },
    };
    if (!this.prisma) {
      throw new Error('PrismaService is NOT injected');
    }
    const pipeline = await this.prisma.pipeline.findUnique(pipelineFindPayload);

    if (!pipeline) {
      throw new BadRequestException(`Pipeline with ID "${pipelineId}" not found`);
    }



    const stagesMap = new Map<string, string>();
    
    // Добавляем в map и по имени, и по ID
    pipeline.stages.forEach((stage) => {
      stagesMap.set(stage.name, stage.id);
      stagesMap.set(stage.id, stage.id); // Для поддержки прямого указания ID
    });

    return stagesMap;
  }

  /**
   * Загрузка map пользователей (fullName/email -> userId)
   */
  private async loadUsersMap(): Promise<Map<string, string>> {
    const userFindManyPayload = {
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    };
    if (!this.prisma) {
      throw new Error('PrismaService is NOT injected');
    }
    const users = await this.prisma.user.findMany(userFindManyPayload);

    const usersMap = new Map<string, string>();
    
    users.forEach((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      
      // Добавляем по полному имени
      if (fullName) {
        usersMap.set(fullName, user.id);
        usersMap.set(`${fullName}|name`, user.id); // Для отображения в errors
      }
      
      // Добавляем по email
      if (user.email) {
        usersMap.set(user.email, user.id);
        usersMap.set(`${user.email}|email`, user.id);
      }
      
      // Добавляем по firstName
      if (user.firstName) {
        usersMap.set(user.firstName, user.id);
      }
      
      // Добавляем по ID (для прямого указания)
      usersMap.set(user.id, user.id);
    });

    return usersMap;
  }
}

