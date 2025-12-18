import { Injectable, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
import { ImportBatchService } from './import-batch.service';
import {
  normalizeEmail,
  normalizePhone,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';
import { ContactFieldMapping, DealFieldMapping } from './dto/field-mapping.dto';
import { ImportResultDto, ImportError, ImportSummary } from './dto/import-result.dto';

/**
 * CSV Import Service
 * 
 * Сервис для импорта контактов и сделок из CSV файлов.
 * Использует streaming парсинг для поддержки больших файлов (10k+ строк).
 */
@Injectable()
export class CsvImportService {
  private readonly BATCH_SIZE = 1000;

  constructor(private readonly importBatchService: ImportBatchService) {}

  /**
   * Получение метаданных полей для импорта
   */
  async getImportMeta(entityType: 'contact' | 'deal'): Promise<{
    fields: Array<{
      key: string;
      label: string;
      required: boolean;
      type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'select';
      description?: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  }> {
    if (entityType === 'contact') {
      return {
        fields: [
          { key: 'fullName', label: 'Full Name', required: true, type: 'string', description: 'Полное имя контакта' },
          { key: 'email', label: 'Email', required: false, type: 'email', description: 'Email адрес' },
          { key: 'phone', label: 'Phone', required: false, type: 'phone', description: 'Номер телефона' },
          { key: 'position', label: 'Position', required: false, type: 'string', description: 'Должность' },
          { key: 'companyName', label: 'Company Name', required: false, type: 'string', description: 'Название компании' },
          { key: 'tags', label: 'Tags', required: false, type: 'string', description: 'Теги (через запятую)' },
          { key: 'notes', label: 'Notes', required: false, type: 'string', description: 'Заметки' },
        ],
      };
    } else {
      return {
        fields: [
          { key: 'number', label: 'Deal Number', required: true, type: 'string', description: 'Номер сделки' },
          { key: 'title', label: 'Title', required: true, type: 'string', description: 'Название сделки' },
          { key: 'amount', label: 'Amount', required: false, type: 'number', description: 'Сумма сделки' },
          { key: 'pipelineId', label: 'Pipeline', required: true, type: 'select', description: 'Воронка продаж' },
          { key: 'stageId', label: 'Stage', required: true, type: 'select', description: 'Стадия сделки' },
          { key: 'email', label: 'Contact Email', required: false, type: 'email', description: 'Email контакта для связи' },
          { key: 'phone', label: 'Contact Phone', required: false, type: 'phone', description: 'Телефон контакта для связи' },
          { key: 'assignedToId', label: 'Assigned To', required: false, type: 'select', description: 'Ответственный' },
          { key: 'expectedCloseAt', label: 'Expected Close Date', required: false, type: 'date', description: 'Ожидаемая дата закрытия' },
          { key: 'description', label: 'Description', required: false, type: 'string', description: 'Описание' },
          { key: 'tags', label: 'Tags', required: false, type: 'string', description: 'Теги (через запятую)' },
        ],
      };
    }
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
   * @param contactEmailPhoneMap - Map для резолва contactId по email/phone (опционально)
   * @param delimiter - Разделитель CSV (по умолчанию ',', поддерживается ';')
   * @param dryRun - Режим предпросмотра без записи в БД
   */
  async importDeals(
    fileStream: Readable,
    mapping: DealFieldMapping,
    userId: string,
    contactEmailPhoneMap?: Map<string, string>, // Map для резолва contactId по email/phone
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
              contactEmailPhoneMap,
            );
            if (dealData) {
              rows.push(dealData);
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
            // Batch обработка сделок
            if (rows.length > 0) {
              if (dryRun) {
                // В режиме dry-run только симулируем импорт
                // Проверяем существующие сделки по number
                const numbers = rows.map(r => r.number).filter((n): n is string => Boolean(n));
                const existingDeals = await this.importBatchService.batchFindDealsByNumbers(numbers);
                
                let willCreate = 0;
                let willUpdate = 0;
                
                rows.forEach((row) => {
                  if (existingDeals.has(row.number)) {
                    willUpdate++;
                  } else {
                    willCreate++;
                  }
                });
                
                summary.created = willCreate;
                summary.updated = willUpdate;
              } else {
                const result = await this.importBatchService.batchCreateDeals(rows, userId);
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
   * Маппинг CSV строки в данные контакта
   */
  private mapContactRow(
    csvRow: Record<string, string>,
    mapping: ContactFieldMapping,
    rowNumber: number,
    errors: ImportError[],
  ): {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    position?: string | null;
    companyName?: string | null;
    companyId?: string | null;
    tags?: string[];
    notes?: string | null;
    social?: any;
  } | null {
    // Получаем значение из CSV по маппингу
    const getValue = (fieldName?: string): string | undefined => {
      if (!fieldName) return undefined;
      const value = csvRow[fieldName];
      return value?.trim() || undefined;
    };

    // FullName обязателен
    const fullNameValue = getValue(mapping.fullName);
    if (!fullNameValue) {
      errors.push({
        row: rowNumber,
        field: 'fullName',
        error: 'Full name is required',
      });
      return null;
    }

    const fullName = sanitizeTextFields(fullNameValue);
    if (!fullName) {
      errors.push({
        row: rowNumber,
        field: 'fullName',
        value: fullNameValue,
        error: 'Full name cannot be empty',
      });
      return null;
    }

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
    contactEmailPhoneMap?: Map<string, string>,
  ): {
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
  } | null {
    const getValue = (fieldName?: string): string | undefined => {
      if (!fieldName) return undefined;
      const value = csvRow[fieldName];
      return value?.trim() || undefined;
    };

    // Number обязателен
    const numberValue = getValue(mapping.number);
    if (!numberValue) {
      errors.push({
        row: rowNumber,
        field: 'number',
        error: 'Deal number is required',
      });
      return null;
    }

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

    // PipelineId и StageId обязательны
    const pipelineId = getValue(mapping.pipelineId);
    const stageId = getValue(mapping.stageId);

    if (!pipelineId) {
      errors.push({
        row: rowNumber,
        field: 'pipelineId',
        error: 'Pipeline ID is required',
      });
      return null;
    }

    if (!stageId) {
      errors.push({
        row: rowNumber,
        field: 'stageId',
        error: 'Stage ID is required',
      });
      return null;
    }

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

    return {
      number: numberValue,
      title: titleValue,
      amount: getValue(mapping.amount) || null,
      budget: getValue(mapping.budget) || null,
      pipelineId,
      stageId,
      assignedToId: getValue(mapping.assignedToId) || null,
      contactId: contactId || null,
      companyId: getValue(mapping.companyId) || null,
      expectedCloseAt: expectedCloseAt || null,
      description: sanitizeOptionalTextFields(getValue(mapping.description)) || null,
      tags: tags.length > 0 ? tags : undefined,
    };
  }
}

