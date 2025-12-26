import { Injectable, BadRequestException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
// CRITICAL: CSV parsing is done on frontend, no need for csv-parser or Readable stream
import { ImportBatchService } from './import-batch.service';
import { PrismaService } from '@/common/services/prisma.service';
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
  ) {
    // CRITICAL: Verify PrismaService injection in constructor
    if (!this.prisma) {
      console.error('[CSV IMPORT SERVICE] CRITICAL ERROR: PrismaService is NOT injected in constructor!');
      console.error('[CSV IMPORT SERVICE] Constructor params:', {
        hasImportBatchService: !!this.importBatchService,
        hasPrisma: !!this.prisma,
        prismaType: typeof this.prisma,
        prismaValue: this.prisma,
      });
      throw new Error('PrismaService is NOT injected in CsvImportService constructor. Check ImportExportModule providers.');
    }
    console.log('[CSV IMPORT SERVICE] Constructor: PrismaService injected successfully:', {
      hasPrisma: !!this.prisma,
      prismaType: typeof this.prisma,
      prismaMethods: this.prisma ? Object.keys(this.prisma).slice(0, 10) : [],
    });
  }


  /**
   * Получение метаданных полей для импорта
   * Возвращает полную информацию о доступных полях, пайплайнах и пользователях
   */
  async getImportMeta(entityType: 'contact' | 'deal'): Promise<ImportMetaResponseDto> {
    try {
      console.log('[IMPORT META] Getting import meta for entityType:', entityType);
      // ALWAYS return mixed import meta (full list of fields for both contact and deal)
      // This supports MIXED CSV IMPORT where one CSV can contain both entities
      const result = await this.getMixedImportMeta();
      console.log('[IMPORT META] Successfully retrieved import meta:', {
        systemFieldsCount: result.systemFields?.length || 0,
        customFieldsCount: result.customFields?.length || 0,
        pipelinesCount: result.pipelines?.length || 0,
        usersCount: result.users?.length || 0,
      });
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
    console.log('🔥🔥🔥 getDealsImportMeta - START');
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
    console.log('🔥 getDealsImportMeta - fetching pipelines...');
    const pipelines: PipelineDto[] = await this.getPipelinesWithStages();
    console.log('🔥 getDealsImportMeta - pipelines fetched:', pipelines.length);

    // Получение активных пользователей
    console.log('🔥 getDealsImportMeta - fetching users...');
    const users: UserDto[] = await this.getActiveUsers();
    console.log('🔥 getDealsImportMeta - users fetched:', users.length);

    const result = {
      systemFields,
      customFields,
      pipelines,
      users,
    };
    
    console.log('🔥🔥🔥 getDealsImportMeta - SUCCESS, returning:', {
      systemFieldsCount: result.systemFields.length,
      customFieldsCount: result.customFields.length,
      pipelinesCount: result.pipelines.length,
      usersCount: result.users.length,
    });
    
    return result;
  }

  /**
   * Получение метаданных для MIXED импорта (контакты + сделки в одном плоском массиве)
   */
  private async getMixedImportMeta(): Promise<any> {
    console.log('🔥🔥🔥 getMixedImportMeta - START');
    try {
      console.log('[IMPORT META] Getting contact meta...');
      // Получаем метаданные контактов
      const contactMeta = await this.getContactsImportMeta();
      console.log('[IMPORT META] Contact meta retrieved:', {
        systemFieldsCount: contactMeta.systemFields?.length || 0,
        customFieldsCount: contactMeta.customFields?.length || 0,
        usersCount: contactMeta.users?.length || 0,
      });
      
      console.log('[IMPORT META] Getting deal meta...');
      // Получаем метаданные сделок
      const dealMeta = await this.getDealsImportMeta();
      console.log('🔥🔥🔥 getDealsImportMeta returned:', {
        systemFieldsCount: dealMeta.systemFields?.length || 0,
        customFieldsCount: dealMeta.customFields?.length || 0,
        pipelinesCount: dealMeta.pipelines?.length || 0,
        usersCount: dealMeta.users?.length || 0,
        systemFieldsType: typeof dealMeta.systemFields,
        systemFieldsIsArray: Array.isArray(dealMeta.systemFields),
        customFieldsType: typeof dealMeta.customFields,
        customFieldsIsArray: Array.isArray(dealMeta.customFields),
      });
    
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
    
    console.log('🔥🔥🔥 getMixedImportMeta - SUCCESS, returning:', {
      systemFieldsCount: result.systemFields.length,
      customFieldsCount: result.customFields.length,
      pipelinesCount: result.pipelines.length,
      usersCount: result.users.length,
    });
    
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
      console.log('[IMPORT META] Fetching pipelines...');
      const pipelines = await this.prisma.pipeline.findMany({
        where: { isActive: true },
        include: {
          stages: {
            orderBy: { order: 'asc' },
          },
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
      console.log('[IMPORT META] Found pipelines:', pipelines.length);

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
        isClosed: stage.isClosed || false,
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
  ): Promise<ImportResultDto> {
    // 🔥 DIAGNOSTIC: Log entry point
    console.log('🔥 IMPORT ENTRY - importDeals called');
    console.log('🔥 Parameters:', {
      rowsCount: rows?.length || 0,
      hasMapping: !!mapping,
      pipelineId,
      dryRun,
      hasUser: !!user,
      userId: user?.id || user?.userId,
    });
    
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
      console.log('[IMPORT CONTEXT]', { 
        userId,
        dryRun, 
        pipelineId,
        hasUser: !!user,
        mapping,
        mappingKeys: Object.keys(mapping || {}),
        hasTitleMapping: mapping?.title ? true : false,
        titleColumn: mapping?.title
      });

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
          console.log('[IMPORT PIPELINE DEBUG] Attempting to load pipeline:', { 
            pipelineId
          });
            
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
            
            console.log('[IMPORT PIPELINE DEBUG] Pipeline load result:', { 
              pipelineId, 
              found: !!pipeline,
              hasStages: !!(pipeline?.stages),
              stagesCount: pipeline?.stages?.length || 0
            });
            
            if (!pipeline) {
              // Pipeline not found - pipeline remains null
              // Pipeline is optional - import continues without stage validation
              warnings.push(`Pipeline with ID "${pipelineId}" not found, stage validation will be skipped`);
              stagesMap = new Map<string, string>();
              defaultStageId = undefined;
              console.log('[IMPORT PIPELINE DEBUG]', { pipelineId, pipelineLoaded: false, stagesCount: 0, reason: 'pipeline not found' });
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
                console.log('[IMPORT PIPELINE DEBUG]', { pipelineId, pipelineLoaded: true, stagesCount });
              } else {
                stagesMap = new Map<string, string>();
                defaultStageId = undefined;
                console.log('[IMPORT PIPELINE DEBUG]', { pipelineId, pipelineLoaded: true, stagesCount: 0, reason: 'no stages array' });
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
          console.log('[IMPORT PIPELINE DEBUG]', { pipelineId, pipelineLoaded: false, stagesCount: 0, reason: 'exception', error: error instanceof Error ? error.message : 'Unknown' });
        }
      } else {
        // No pipelineId provided - initialize empty maps
        // Pipeline remains null - will be handled at row level
        stagesMap = new Map<string, string>();
        defaultStageId = undefined;
        console.log('[IMPORT PIPELINE DEBUG]', { pipelineId: null, pipelineLoaded: false, stagesCount: 0, reason: 'pipelineId missing' });
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
    console.log('[IMPORT DEBUG] parsed rows:', rows.length);
    
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
          console.log('[IMPORT ROW SKIPPED]', {
            row: rowNumber,
            reason,
            title,
            pipelineId: pipelineId || '',
            stageId: '',
            hasErrors: 0
          });
          summary.skipped++;
          continue;
        }
        
          summary.total++;

        // CRITICAL: Wrap EACH row processing in try/catch - NEVER throw
        try {
          // Log mapping and parsed row before validation (first row only for debugging)
          if (rowNumber === 1) {
            console.log('[IMPORT ROW VALIDATION]', {
              rowNumber,
              mapping,
              csvRowKeys: Object.keys(trimmedRow),
              csvRowSample: Object.fromEntries(
                Object.entries(trimmedRow).slice(0, 5).map(([k, v]) => [k, typeof v === 'string' ? v.substring(0, 50) : v])
              ),
              titleMapping: mapping.title,
              titleColumn: mapping.title,
              titleValue: mapping.title ? trimmedRow[mapping.title] : undefined,
              titleExists: mapping.title ? (mapping.title in trimmedRow) : false
            });
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
            console.log('[IMPORT ROW SKIPPED]', {
              row: rowNumber,
              reason,
              title,
              pipelineId: pipelineId || '',
              stageId: '',
              hasErrors: rowErrors.length
            });
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
            );
          
            if (dealData) {
            // Log dealData to verify all fields are present
            console.log(`[MAP DEAL ROW RESULT] Row ${rowNumber}:`, {
              number: dealData.number,
              title: dealData.title,
              amount: dealData.amount,
              budget: dealData.budget,
              assignedToId: dealData.assignedToId,
              contactId: dealData.contactId,
              companyId: dealData.companyId,
              expectedCloseAt: dealData.expectedCloseAt,
              description: dealData.description ? dealData.description.substring(0, 50) + '...' : null,
              tags: dealData.tags,
              rejectionReasons: dealData.rejectionReasons,
              stageId: dealData.stageId,
              stageValue: dealData.stageValue,
            });
            
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
            console.log('[IMPORT ROW SKIPPED]', {
              row: rowNumber,
              reason,
              title,
              pipelineId: pipelineId || 'N/A',
              stageId: dealData.stageId || 'N/A',
              hasErrors: 1
            });
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
        console.log('[IMPORT DEALS] Processing stages and deals:', {
          processedRowsCount: processedRows.length,
          dryRun,
          hasPipeline: !!pipeline,
          pipelineId,
          sampleProcessedRow: processedRows[0] ? {
            hasStageId: !!processedRows[0].stageId,
            hasStageValue: !!processedRows[0].stageValue,
            stageId: processedRows[0].stageId,
            stageValue: processedRows[0].stageValue,
            title: processedRows[0].title,
          } : null,
        });
        
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
                console.log('[IMPORT DEALS] Creating stages:', {
                  stagesToCreateCount: stagesToCreate.length,
                  stagesToCreate: stagesToCreate.map(s => s.name),
                  pipelineId,
                });
                
                for (const stageToCreate of stagesToCreate) {
                  try {
                    console.log('[IMPORT DEALS] Creating stage:', stageToCreate.name);
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
                        isClosed: false,
                      },
                    });
                    console.log('[IMPORT DEALS] Stage created:', {
                      id: newStage.id,
                      name: newStage.name,
                      pipelineId: newStage.pipelineId,
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
              console.log('[IMPORT DEALS] Before filtering validRows:', {
                updatedRowsCount: updatedRows.length,
                defaultStageId,
                hasPipeline: !!pipeline,
                sampleRow: updatedRows[0] ? {
                  hasStageId: !!updatedRows[0].stageId,
                  hasStageValue: !!updatedRows[0].stageValue,
                  stageId: updatedRows[0].stageId,
                  stageValue: updatedRows[0].stageValue,
                  title: updatedRows[0].title,
                } : null,
              });
              
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
              
              console.log('[IMPORT DEALS] After filtering validRows:', {
                validRowsCount: validRows.length,
                updatedRowsCount: updatedRows.length,
                filteredOut: updatedRows.length - validRows.length,
                dryRun,
              });
              
              console.log('[IMPORT DEALS] About to check validRows.length:', {
                validRowsLength: validRows.length,
                dryRun,
                willEnterDryRun: dryRun === true,
                willEnterActualImport: dryRun === false,
              });
              
              if (validRows.length > 0) {
                console.log('[IMPORT DEALS] Entering validRows.length > 0 block, dryRun:', dryRun);
                if (dryRun) {
                  // Log: Перед dry-run simulate
                  console.log('[IMPORT DEBUG] DRY RUN rows:', rows.length);
                  // CRITICAL: Dry-run must execute ALL the same validations as actual import
                  // The ONLY difference: NO DB write operations (no batchCreateDeals call)
                  
                  // CRITICAL: Execute ALL the same validations as actual import
                  // Filter out rows without valid stageId, title, pipelineId
                  const dealsWithNumber: Array<{
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
                  }> = [];
                  
                  // CRITICAL: Execute the SAME validation loop as actual import
                  for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
                    const row = validRows[rowIndex];
                    const rowNumber = rowIndex + 1;
                    
                    // ЖЕСТКАЯ ВАЛИДАЦИЯ: stageId обязателен (same as actual import)
                    if (!row.stageId || row.stageId.trim() === '') {
                      const reason = 'Stage is required for deal import';
                      console.log('[IMPORT ROW SKIPPED]', {
                        row: rowNumber,
                        reason,
                        title: row.title || 'N/A',
                        pipelineId: row.pipelineId || 'N/A',
                        stageId: row.stageId || 'MISSING',
                        hasErrors: 1
                      });
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
                      console.log('[IMPORT ROW SKIPPED]', {
                        row: rowNumber,
                        reason,
                        title: 'MISSING',
                        pipelineId: row.pipelineId || 'N/A',
                        stageId: row.stageId || 'N/A',
                        hasErrors: 1
                      });
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
                  
                  console.log('[IMPORT DEALS] Dry-run validation complete:', {
                    dealsCount: dealsWithNumber.length,
                    filteredOut: validRows.length - dealsWithNumber.length,
                    sampleDeal: dealsWithNumber[0] ? {
                      number: dealsWithNumber[0].number,
                      title: dealsWithNumber[0].title,
                      pipelineId: dealsWithNumber[0].pipelineId,
                      stageId: dealsWithNumber[0].stageId,
                    } : null,
                  });
                  
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
                  
                  console.log('[IMPORT RESULT MUTATION]', { 
                    summary: { ...summary }, 
                    dryRun: true, 
                    reason: 'dry-run simulation complete',
                    dealsWithNumberCount: dealsWithNumber.length,
                    existingDealsCount: existingDeals.size
                  });
                } else {
                  // Log: Перед actual import
                  console.log('[IMPORT DEBUG] ACTUAL IMPORT rows:', rows.length);
                  // Actual import - create/update deals
                  console.log('[IMPORT DEALS] Starting actual import (not dry-run):', {
                    validRowsCount: validRows.length,
                    userId,
                    pipelineId,
                    pipeline: pipeline ? 'LOADED' : 'NULL',
                    hasPipeline: !!pipeline,
                    pipelineLoaded: pipelineLoaded,
                  });
                  
                  // CRITICAL DEBUG: Check condition before actual import
                  console.log('[IMPORT ACTUAL CRITICAL CHECK]', {
                    pipeline: pipeline ? 'LOADED' : 'NULL',
                    hasPipeline: !!pipeline,
                    pipelineId: pipelineId,
                    validRowsCount: validRows.length,
                    willCallBatchCreateDeals: validRows.length > 0,
                    processedRowsCount: processedRows.length,
                    updatedRowsCount: updatedRows.length,
                  });
                  
                  console.log('[IMPORT DEALS] Proceeding with import:', {
                    hasPipeline: !!pipeline,
                    validRowsCount: validRows.length,
                    userId,
                  });
                  // Log: ПЕРЕД началом обработки строк в actual import
                  console.log('[IMPORT ACTUAL] start', { rows: rows.length });
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
                      }> = [];
                  
                  try {
                      for (let rowIndex = 0; rowIndex < validRows.length; rowIndex++) {
                        const row = validRows[rowIndex];
                        const rowNumber = rowIndex + 1;
                        
                        // ЖЕСТКАЯ ВАЛИДАЦИЯ: stageId обязателен
                        if (!row.stageId || row.stageId.trim() === '') {
                          const reason = 'Stage is required for deal import';
                          console.log('[IMPORT ROW SKIPPED]', {
                            row: rowNumber,
                            reason,
                            title: row.title || 'N/A',
                            pipelineId: row.pipelineId || 'N/A',
                            stageId: row.stageId || 'MISSING',
                            hasErrors: 1
                          });
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
                          console.log('[IMPORT ROW SKIPPED]', {
                            row: rowNumber,
                            reason,
                            title: 'MISSING',
                            pipelineId: row.pipelineId || 'N/A',
                            stageId: row.stageId || 'N/A',
                            hasErrors: 1
                          });
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
                        
                        // SOFT VALIDATION: If pipeline is loaded, validate that stageId belongs to pipeline
                        // This is soft validation - does NOT block import if validation fails
                        if (pipeline && row.stageId && pipeline.stages) {
                          const stageExists = pipeline.stages.some((s: any) => s.id === row.stageId);
                          if (!stageExists) {
                            // Soft validation warning - stageId may not belong to pipeline
                            // But import continues - this is a warning, not an error
                            warnings.push(`Row ${rowNumber}: Stage "${row.stageId}" may not belong to pipeline "${rowPipelineId}"`);
                          }
                        }
                        
                        // Все валидации пройдены - добавляем в dealsWithNumber
                        // CRITICAL: Include ALL fields from mapDealRow, not just number, stageId, title, pipelineId
                        const dealToCreate = {
                          number: row.number || `DEAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate if missing
                          title: row.title, // НИКОГДА не передаем пустую строку
<<<<<<< HEAD
                          pipelineId: rowPipelineId, // Use row.pipelineId or fallback to function parameter (always string here)
=======
                          amount: row.amount !== undefined ? row.amount : null,
                          budget: row.budget !== undefined ? row.budget : null,
                          pipelineId: rowPipelineId, // Use row.pipelineId or fallback to function parameter
                          stageId: row.stageId, // НИКОГДА не передаем пустую строку
                          assignedToId: row.assignedToId !== undefined ? row.assignedToId : null,
                          contactId: row.contactId !== undefined ? row.contactId : null,
                          companyId: row.companyId !== undefined ? row.companyId : null,
                          expectedCloseAt: row.expectedCloseAt !== undefined ? row.expectedCloseAt : null,
                          description: row.description !== undefined ? row.description : null,
                          tags: row.tags !== undefined ? row.tags : undefined,
                          rejectionReasons: row.rejectionReasons !== undefined ? row.rejectionReasons : undefined,
                          reason: row.reason !== undefined ? row.reason : null,
                        };
                        
                        console.log(`[IMPORT DEAL DATA] Row ${rowNumber} deal data:`, {
                          number: dealToCreate.number,
                          title: dealToCreate.title,
                          amount: dealToCreate.amount,
                          budget: dealToCreate.budget,
                          assignedToId: dealToCreate.assignedToId,
                          contactId: dealToCreate.contactId,
                          companyId: dealToCreate.companyId,
                          expectedCloseAt: dealToCreate.expectedCloseAt,
                          description: dealToCreate.description ? dealToCreate.description.substring(0, 50) + '...' : null,
                          tags: dealToCreate.tags,
                          rejectionReasons: dealToCreate.rejectionReasons,
                          reason: dealToCreate.reason,
>>>>>>> 373640c944765c28701d14c2da26fdd3116ea98d
                        });
                        
                        dealsWithNumber.push(dealToCreate);
                      }
                      
                      console.log('[IMPORT DEALS] Calling batchCreateDeals:', {
                        dealsCount: dealsWithNumber.length,
                        filteredOut: validRows.length - dealsWithNumber.length,
                        sampleDeal: dealsWithNumber[0] ? {
                          number: dealsWithNumber[0].number,
                          title: dealsWithNumber[0].title,
                          pipelineId: dealsWithNumber[0].pipelineId,
                          stageId: dealsWithNumber[0].stageId,
                        } : null,
                      });
                      
                      const result = await this.importBatchService.batchCreateDeals(dealsWithNumber, userId);
                      
                      console.log('[IMPORT DEALS] batchCreateDeals result:', {
                        created: result.created,
                        updated: result.updated,
                        errorsCount: result.errors.length,
                        errors: result.errors.slice(0, 5), // First 5 errors
                      });
                      
                      summary.created += result.created;
                      summary.updated += result.updated;
                      summary.failed += result.errors.length;
                      
                      console.log('[IMPORT RESULT MUTATION]', { 
                        summary: { ...summary }, 
                        dryRun: false, 
                        reason: 'after batchCreateDeals',
                        batchResult: { created: result.created, updated: result.updated, errors: result.errors.length }
                      });

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
              console.log('[IMPORT CONTEXT]', { 
                dryRun, 
                rows: processedRows.length,
                parsedRows: summary.total 
              });
              
              // Log final result before return
              console.log('[IMPORT RESULT MUTATION]', { 
                summary: { ...summary }, 
                dryRun, 
                reason: 'final result before return',
                resultSummary: result.summary
              });
              
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
                console.log('[DRY RUN RESULT]', JSON.stringify(result, null, 2));
              } else {
                // Log: В КОНЦЕ функции перед return для actual import
                console.log('[IMPORT ACTUAL] result', {
                  created: summary.created,
                  updated: summary.updated,
                  skipped: summary.skipped,
                  failed: summary.failed
                });
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
              console.log('[IMPORT CONTEXT]', { 
                dryRun, 
                rows: 0,
                parsedRows: summary.total 
              });
              
              // Log final result before return (no rows case)
              console.log('[IMPORT RESULT MUTATION]', { 
                summary: { ...summary }, 
                dryRun, 
                reason: 'final result before return (no rows)',
                resultSummary: result.summary
              });
              
              if (dryRun) {
                console.log('[DRY RUN RESULT]', JSON.stringify(result, null, 2));
              } else {
                // Log: В КОНЦЕ функции перед return для actual import (no rows case)
                console.log('[IMPORT ACTUAL] result', {
                  created: summary.created,
                  updated: summary.updated,
                  skipped: summary.skipped,
                  failed: summary.failed
                });
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
              console.log('[IMPORT RESULT MUTATION]', { 
                summary: { ...summary }, 
                dryRun: true, 
                reason: 'error catch block (dry-run)',
                resultSummary: result.summary
              });
              console.log('[DRY RUN RESULT]', JSON.stringify(result, null, 2));
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
        console.log('[IMPORT RESULT MUTATION]', { 
          summary: { ...result.summary }, 
          dryRun: true, 
          reason: 'top-level catch block (dry-run)',
          resultSummary: result.summary
        });
        console.log('[DRY RUN RESULT]', JSON.stringify(result, null, 2));
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
        // Resolve owner by email OR fullName (case-insensitive)
        const lookupValue = ownerValue.toLowerCase().trim();
        let foundUserId: string | undefined;
        
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
        rejectionReasons.push(...reasonsValue.split(',').map((r) => r.trim()).filter(Boolean));
      }
    }



    // Парсинг reason (причина/основание)
    const reasonValue = getValue(mapping.reason);

    return {
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
    };
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
    console.log('PRISMA PIPELINE FIND UNIQUE PAYLOAD (loadPipelineStagesMap):', pipelineFindPayload);
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
    console.log('PRISMA USER FIND MANY PAYLOAD (loadUsersMap):', userFindManyPayload);
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

