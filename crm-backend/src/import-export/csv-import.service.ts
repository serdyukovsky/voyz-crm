import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
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
  ) {}

  /**
   * Получение метаданных полей для импорта
   * Возвращает полную информацию о доступных полях, пайплайнах и пользователях
   */
  async getImportMeta(entityType: 'contact' | 'deal'): Promise<ImportMetaResponseDto> {
    // ALWAYS return mixed import meta (full list of fields for both contact and deal)
    // This supports MIXED CSV IMPORT where one file can contain both entities
    return this.getMixedImportMeta();
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
      { key: 'pipelineId', label: 'Pipeline', required: false, type: 'select', description: 'Pipeline будет выбран в UI перед импортом', group: 'basic', entity: 'deal' },
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

    // Получение пайплайнов со стадиями
    const pipelines: PipelineDto[] = await this.getPipelinesWithStages();

    // Получение активных пользователей
    const users: UserDto[] = await this.getActiveUsers();

    return {
      systemFields,
      customFields,
      pipelines,
      users,
    };
  }

  /**
   * Получение метаданных для MIXED импорта (контакты + сделки в одном плоском массиве)
   */
  private async getMixedImportMeta(): Promise<any> {
    // Получаем метаданные контактов
    const contactMeta = await this.getContactsImportMeta();
    
    // Получаем метаданные сделок
    const dealMeta = await this.getDealsImportMeta();
    
    // Объединяем все поля в один плоский массив
    const allFields: ImportFieldDto[] = [
      ...contactMeta.systemFields,
      ...contactMeta.customFields,
      ...dealMeta.systemFields,
      ...dealMeta.customFields,
    ];
    
    return {
      fields: allFields, // Flat array with entity property on each field
      pipelines: dealMeta.pipelines,
      users: dealMeta.users,
    };
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
      const customFields = await this.prisma.dealCustomField.findMany({
        where: { isActive: true },
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
        isClosed: stage.isClosed || false,
      })),
    }));
  }

  /**
   * Получение активных пользователей
   */
  private async getActiveUsers(): Promise<UserDto[]> {
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
   * @param fileStream - Stream CSV файла
   * @param mapping - Маппинг полей CSV → внутренние поля
   * @param userId - ID пользователя, выполняющего импорт
   * @param delimiter - Разделитель CSV (по умолчанию ',', поддерживается ';')
   * @param dryRun - Режим предпросмотра без записи в БД
   */
  async importContacts(
    fileStream: Readable,
    mapping: ContactFieldMapping,
    userId: string,
    delimiter: ',' | ';' = ',',
    dryRun: boolean = false,
  ): Promise<ImportResultDto> {
    const summary: ImportSummary = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
    };

    const errors: ImportError[] = [];
    const rows: Array<{
      fullName: string;
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

    return new Promise((resolve, reject) => {
      const parser = csv({
        separator: delimiter,
        headers: true,
      });

      let rowNumber = 1; // Header = row 1

      parser
        .on('data', (csvRow: Record<string, string>) => {
          rowNumber++;
          summary.total++;

          try {
            const contactData = this.mapContactRow(csvRow, mapping, rowNumber, errors);
            if (contactData) {
              rows.push(contactData);
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
        })
        .on('error', (error) => {
          errors.push({
            row: rowNumber,
            error: `CSV parsing error: ${error.message}`,
          });
          summary.failed++;
        })
        .on('end', async () => {
          try {
            // Batch обработка контактов
            if (rows.length > 0) {
              if (dryRun) {
                // В режиме dry-run только симулируем импорт
                // Проверяем существующие контакты для подсчета willUpdate
                const emails = rows.map(r => r.email).filter((e): e is string => Boolean(e));
                const phones = rows.map(r => r.phone).filter((p): p is string => Boolean(p));
                const existingMap = await this.importBatchService.batchFindContactsByEmailOrPhone(emails, phones);
                
                let willCreate = 0;
                let willUpdate = 0;
                
                rows.forEach((row) => {
                  const key = row.email ? `email:${row.email}` : row.phone ? `phone:${row.phone}` : null;
                  if (key && existingMap.has(key)) {
                    willUpdate++;
                  } else {
                    willCreate++;
                  }
                });
                
                summary.created = willCreate;
                summary.updated = willUpdate;
                // В dry-run не меняем failed/skipped, они уже подсчитаны
              } else {
                const result = await this.importBatchService.batchCreateContacts(rows, userId);
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

            resolve({
              summary,
              errors,
            });
          } catch (error) {
            reject(error);
          }
        });

      fileStream
        .on('error', (error) => {
          reject(new BadRequestException(`File stream error: ${error.message}`));
        })
        .pipe(parser);
    });
  }

  /**
   * Импорт сделок из CSV
   * 
   * @param fileStream - Stream CSV файла
   * @param mapping - Маппинг полей CSV → внутренние поля
   * @param userId - ID пользователя, выполняющего импорт
   * @param pipelineId - ID пайплайна для resolution стадий по имени
   * @param contactEmailPhoneMap - Map для резолва contactId по email/phone (опционально)
   * @param delimiter - Разделитель CSV (по умолчанию ',', поддерживается ';')
   * @param dryRun - Режим предпросмотра без записи в БД
   */
  async importDeals(
    fileStream: Readable,
    mapping: DealFieldMapping,
    user: any,
    pipelineId: string,
    defaultAssignedToId?: string, // Дефолтный ответственный для всех строк (для "apply to all")
    contactEmailPhoneMap?: Map<string, string>, // Map для резолва contactId по email/phone
    delimiter: ',' | ';' = ',',
    dryRun: boolean = false,
  ): Promise<ImportResultDto> {
    // ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ В САМОМ НАЧАЛЕ ФУНКЦИИ
    console.log('=== importDeals START ===');
    console.log('user:', user);
    console.log('workspaceId:', user?.workspaceId);
    console.log('pipelineId:', pipelineId);
    console.log('mapping:', mapping);
    console.log('dryRun:', dryRun);
    console.log('rows length: 0 (not parsed yet)');
    console.log('=======================');

    // ЗАЩИТНЫЕ ПРОВЕРКИ В САМОМ НАЧАЛЕ - явные ошибки вместо silent crash
    if (!user) {
      throw new Error('ImportDeals: user is missing');
    }

    if (!user.workspaceId) {
      throw new Error('ImportDeals: user.workspaceId is missing');
    }

    if (!pipelineId) {
      throw new Error('ImportDeals: pipelineId is missing');
    }

    const userId = user.userId || user.id;
    
    console.log('importDeals called:', { 
      pipelineId, 
      userId, 
      dryRun, 
      hasMapping: !!mapping,
      mappingTitle: mapping?.title 
    });
    
    // Валидация входных параметров - все ошибки валидации возвращают 400
    if (typeof pipelineId !== 'string' || pipelineId.trim() === '') {
      console.error('Validation error: pipelineId is invalid', { pipelineId, type: typeof pipelineId });
      throw new BadRequestException('pipelineId must be a non-empty string');
    }

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new BadRequestException('userId is required and must be a non-empty string');
    }

    if (!mapping || typeof mapping !== 'object') {
      throw new BadRequestException('mapping is required and must be an object');
    }

    if (!mapping.title || typeof mapping.title !== 'string' || mapping.title.trim() === '') {
      throw new BadRequestException('mapping.title is required and must be a non-empty string');
    }

    const summary: ImportSummary = {
      total: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
    };

    const errors: ImportError[] = [];
    
    // Загружаем stages для выбранного pipeline для resolution по имени
    // loadPipelineStagesMap уже проверяет существование pipeline и выбрасывает BadRequestException
    console.log('PRISMA PIPELINE FIND UNIQUE PAYLOAD (loadPipelineStagesMap):', {
      where: { id: pipelineId },
      include: { stages: true },
    });
    const stagesMap = await this.loadPipelineStagesMap(pipelineId);
    
    // Загружаем users для resolution по имени/email
    console.log('PRISMA USER FIND MANY PAYLOAD (loadUsersMap):', {
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    const usersMap = await this.loadUsersMap();
    
    // Map для сбора всех стадий из CSV (stageName -> firstRowNumber)
    const csvStagesMap = new Map<string, number>();
    
    const rows: Array<{
      number?: string;
      title: string;
      amount?: number | string | null;
      budget?: number | string | null;
      pipelineId: string;
      stageId?: string;
      stageValue?: string; // Оригинальное значение стадии из CSV (для создания стадий)
      assignedToId?: string | null;
      contactId?: string | null;
      companyId?: string | null;
      expectedCloseAt?: Date | string | null;
      description?: string | null;
      tags?: string[];
      rejectionReasons?: string[];
    }> = [];

    // ЗАЩИТНАЯ ПРОВЕРКА: rows должен быть массивом
    if (!Array.isArray(rows)) {
      throw new Error('ImportDeals: rows must be an array');
    }

    return new Promise((resolve, reject) => {
      const parser = csv({
        separator: delimiter,
        headers: true,
      });

      let rowNumber = 1;

      parser
        .on('data', (csvRow: Record<string, string>) => {
          rowNumber++;
          summary.total++;

          try {
            const dealData = this.mapDealRow(
              csvRow,
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
              rows.push(dealData);
            } else {
              summary.skipped++;
            }
          } catch (error) {
            console.error(`Error in mapDealRow for row ${rowNumber}:`, error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
            errors.push({
              row: rowNumber,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            summary.failed++;
          }
        })
        .on('error', (error) => {
          errors.push({
            row: rowNumber,
            error: `CSV parsing error: ${error.message}`,
          });
          summary.failed++;
        })
        .on('end', async () => {
          try {
            // Инициализируем stagesToCreate вне блока if для использования в resolve
            const stagesToCreate: StageToCreate[] = [];
            
            // Batch обработка сделок
            if (rows.length > 0) {
              // Дополнительная проверка pipelineId (на случай если он стал undefined)
              if (!pipelineId || typeof pipelineId !== 'string' || pipelineId.trim() === '') {
                throw new BadRequestException('pipelineId is required and must be a non-empty string');
              }

              // Получаем pipeline со стадиями
              const pipelineFindPayload = {
                where: { id: pipelineId },
                include: {
                  stages: {
                    orderBy: [{ isDefault: 'desc' }, { order: 'asc' }],
                  },
                },
              };
              console.log('PRISMA PIPELINE FIND UNIQUE PAYLOAD:', pipelineFindPayload);
              const pipeline = await this.prisma.pipeline.findUnique(pipelineFindPayload);
              
              if (!pipeline) {
                throw new BadRequestException(`Pipeline with ID "${pipelineId}" not found`);
              }
              
              const defaultStageId = pipeline.stages.find(s => s.isDefault)?.id || pipeline.stages[0]?.id;
              
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
              stagesToCreate.forEach((stage, index) => {
                stage.order = pipeline.stages.length + index;
              });
              
              // Создаем недостающие стадии при actual import
              const createdStagesMap = new Map<string, string>(); // normalizedStageName -> stageId
              
              if (!dryRun && stagesToCreate.length > 0) {
                for (const stageToCreate of stagesToCreate) {
                  try {
                    const stageCreatePayload = {
                      data: {
                        name: stageToCreate.name,
                        order: stageToCreate.order,
                        pipelineId: pipelineId,
                        color: '#6B7280', // Дефолтный цвет
                        isDefault: false,
                        isClosed: false,
                      },
                    };
                    console.log('PRISMA STAGE CREATE PAYLOAD:', stageCreatePayload);
                    const newStage = await this.prisma.stage.create(stageCreatePayload);
                    // Сохраняем по нормализованному имени для поиска (case-insensitive)
                    // Безопасная обработка имени стадии
                    const stageName = typeof stageToCreate.name === 'string' ? stageToCreate.name : String(stageToCreate.name || '');
                    const normalizedName = stageName.toLowerCase().trim();
                    createdStagesMap.set(normalizedName, newStage.id);
                    // Обновляем stagesMap для использования в дальнейшей обработке
                    stagesMap.set(stageToCreate.name, newStage.id);
                    stagesMap.set(normalizedName, newStage.id);
                    stagesMap.set(newStage.id, newStage.id);
                  } catch (error) {
                    errors.push({
                      row: csvStagesMap.get(stageToCreate.name) || -1,
                      field: 'stageId',
                      value: stageToCreate.name,
                      error: `Failed to create stage "${stageToCreate.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
                    });
                  }
                }
              }
              
              // Обновляем stageId для строк с созданными стадиями
              // Используем нормализованное имя для поиска (case-insensitive)
              const updatedRows = rows.map((row) => {
                // Если stageId не установлен, но есть stageValue, пробуем найти в созданных стадиях
                if (!row.stageId && row.stageValue) {
                  // Безопасная обработка stageValue - проверяем что это строка
                  const stageValueStr = typeof row.stageValue === 'string' ? row.stageValue : String(row.stageValue || '');
                  const normalizedStageName = stageValueStr.trim().toLowerCase();
                  
                  // Пробуем найти в созданных стадиях (по нормализованному имени)
                  let createdStageId: string | undefined;
                  for (const [name, id] of createdStagesMap.entries()) {
                    // Безопасная обработка name - проверяем что это строка
                    const nameStr = typeof name === 'string' ? name : String(name || '');
                    if (nameStr.toLowerCase().trim() === normalizedStageName) {
                      createdStageId = id;
                      break;
                    }
                  }
                  
                  if (createdStageId) {
                    row.stageId = createdStageId;
                  } else {
                    // Пробуем найти в обновленном stagesMap (по нормализованному имени)
                    let foundStageId: string | undefined;
                    for (const [name, id] of stagesMap.entries()) {
                      // Безопасная обработка name - проверяем что это строка
                      const nameStr = typeof name === 'string' ? name : String(name || '');
                      if (nameStr.toLowerCase().trim() === normalizedStageName) {
                        foundStageId = id;
                        break;
                      }
                    }
                    if (foundStageId) {
                      row.stageId = foundStageId;
                    } else if (defaultStageId) {
                      // Если не найдено, используем дефолтную стадию
                      row.stageId = defaultStageId;
                    }
                  }
                } else if (!row.stageId && defaultStageId) {
                  // Если stageValue нет, но есть дефолтная стадия, используем её
                  row.stageId = defaultStageId;
                }
                return row;
              });
              
              // Проверка наличия stageId на этапе dry-run/import
              // Ошибки только если:
              // 1. Нет pipeline (уже проверено выше)
              // 2. Стадия пустая И нет default stage
              updatedRows.forEach((row, index) => {
                if (!row.stageId) {
                  // Если есть stageValue, но нет stageId - это значит стадия будет создана, не ошибка
                  // Если нет stageValue и нет defaultStageId - это ошибка
                  if (!row.stageValue && !defaultStageId) {
                    errors.push({
                      row: index + 2, // +2 потому что rowNumber начинается с 1, а индекс с 0
                      field: 'stageId',
                      error: 'Stage is required. Please map a stage field or ensure pipeline has a default stage.',
                    });
                    summary.failed++;
                  }
                }
              });
              
              // Фильтруем строки без stageId для дальнейшей обработки
              // Но включаем строки с stageValue (стадии будут созданы)
              const validRows = updatedRows.filter(row => {
                // Включаем если есть stageId ИЛИ есть stageValue (стадия будет создана)
                return row.stageId || row.stageValue;
              });
              
              if (validRows.length > 0) {
                if (dryRun) {
                  // В режиме dry-run только симулируем импорт
                  // Проверяем существующие сделки по number
                  const numbers = validRows.map(r => r.number).filter((n): n is string => Boolean(n));
                  
                  let existingDeals = new Map<string, { id: string; number: string }>();
                  if (numbers.length > 0) {
                    try {
                      existingDeals = await this.importBatchService.batchFindDealsByNumbers(numbers);
                    } catch (error) {
                      console.error('Error in batchFindDealsByNumbers:', error);
                      // Продолжаем без проверки существующих сделок
                    }
                  }
                  
                  let willCreate = 0;
                  let willUpdate = 0;
                  
                  validRows.forEach((row) => {
                    if (row.number && existingDeals.has(row.number)) {
                      willUpdate++;
                    } else {
                      willCreate++;
                    }
                  });
                  
                  summary.created = willCreate;
                  summary.updated = willUpdate;
                } else {
                  console.log('PRISMA DEAL CREATE PAYLOAD (batchCreateDeals):', {
                    dealsData: validRows,
                    userId: userId,
                    dealsCount: validRows.length,
                  });
                  const result = await this.importBatchService.batchCreateDeals(validRows, userId);
                  summary.created += result.created;
                  summary.updated += result.updated;
                  summary.failed += result.errors.length;

                  result.errors.forEach((err) => {
                    errors.push({
                      row: err.row >= 0 ? err.row : -1,
                      error: err.error,
                    });
                  });
                }
              }
              
              // Возвращаем результат с информацией о стадиях для создания
              resolve({
                summary,
                errors,
                stagesToCreate: stagesToCreate.length > 0 ? stagesToCreate : undefined,
              });
              return;
            }
            
            // Если нет строк для обработки
            resolve({
              summary,
              errors,
              stagesToCreate: stagesToCreate.length > 0 ? stagesToCreate : undefined,
            });
          } catch (error) {
            console.error('Error in importDeals on end handler:', error);
            console.error('Error details:', {
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
              rowsLength: rows.length,
              summary,
              stagesToCreateLength: stagesToCreate.length,
              pipelineId,
            });
            
            // Если это уже BadRequestException, просто пробрасываем его (400)
            if (error instanceof BadRequestException) {
              reject(error);
              return;
            }
            
            // Все остальные ошибки оборачиваем в InternalServerError с понятным сообщением
            // Но лучше преобразовать в BadRequestException если это ошибка валидации
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('not found') || errorMessage.includes('required') || errorMessage.includes('invalid')) {
              reject(new BadRequestException(`Import validation error: ${errorMessage}`));
            } else {
              reject(error);
            }
          }
        });

      fileStream
        .on('error', (error) => {
          reject(new BadRequestException(`File stream error: ${error.message}`));
        })
        .pipe(parser);
    });
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

    // Number опционален
    const numberValue = getValue(mapping.number);

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
    pipelineId: string,
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
    pipelineId: string;
    stageId?: string;
    stageValue?: string; // Оригинальное значение стадии из CSV
    assignedToId?: string | null;
    contactId?: string | null;
    companyId?: string | null;
    expectedCloseAt?: Date | string | null;
    description?: string | null;
    tags?: string[];
    rejectionReasons?: string[];
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
          // stageId остается undefined, но stageName сохраняется
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
        // Пробуем резолвить по имени или email (case-insensitive)
        const lookupValue = ownerValue.toLowerCase().trim();
        let foundUserId: string | undefined;
        
        const usersEntries = Array.from(usersMap.entries());
        for (const [key, id] of usersEntries) {
          if (key.toLowerCase() === lookupValue) {
            foundUserId = id;
            break;
          }
        }
        
        if (foundUserId) {
          assignedToId = foundUserId;
        } else if (usersMap.has(ownerValue)) {
          // Возможно это уже ID пользователя
          assignedToId = usersMap.get(ownerValue)!;
        } else {
          // Не найден - добавляем предупреждение но не блокируем импорт
          errors.push({
            row: rowNumber,
            field: ownerFieldName,
            value: ownerValue,
            error: `User "${ownerValue}" not found. Deal will be created without assignment. Available users: ${Array.from(new Set(usersEntries.map(([k, v]) => k.split('|')[0]))).slice(0, 5).join(', ')}`,
          });
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

