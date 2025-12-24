import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { Prisma } from '@prisma/client';
import {
  normalizeEmail,
  normalizePhone,
  normalizeSocialLinks,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';

/**
 * Import Batch Service
 * 
 * Изолированный сервис для массового импорта данных.
 * НЕ использует contactsService, dealsService, WebSocket, getStats или другие side-effects.
 * 
 * Использует только Prisma напрямую с batch операциями и транзакциями.
 */
@Injectable()
export class ImportBatchService {
  private readonly BATCH_SIZE = 1000; // Размер batch для обработки

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batch поиск существующих контактов по email или phone
   * 
   * @param emails - Массив email адресов (уже нормализованных)
   * @param phones - Массив телефонных номеров (уже нормализованных)
   * @returns Map с ключами "email:{email}" или "phone:{phone}" и значениями Contact
   */
  async batchFindContactsByEmailOrPhone(
    emails: string[],
    phones: string[],
  ): Promise<Map<string, { id: string; email: string | null; phone: string | null }>> {
    // Фильтруем null/undefined значения
    const validEmails = emails.filter((e): e is string => Boolean(e));
    const validPhones = phones.filter((p): p is string => Boolean(p));

    if (validEmails.length === 0 && validPhones.length === 0) {
      return new Map();
    }

    // Один запрос для поиска всех существующих контактов
    const existingContacts = await this.prisma.contact.findMany({
      where: {
        OR: [
          ...(validEmails.length > 0 ? [{ email: { in: validEmails } }] : []),
          ...(validPhones.length > 0 ? [{ phone: { in: validPhones } }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
      },
    });

    // Создаем Map для быстрого поиска
    const contactsMap = new Map<string, { id: string; email: string | null; phone: string | null }>();

    existingContacts.forEach((contact) => {
      if (contact.email) {
        contactsMap.set(`email:${contact.email}`, contact);
      }
      if (contact.phone) {
        contactsMap.set(`phone:${contact.phone}`, contact);
      }
    });

    return contactsMap;
  }

  /**
   * Batch поиск существующих сделок по номерам
   * 
   * @param numbers - Массив номеров сделок
   * @returns Map с ключами "number" и значениями Deal
   */
  async batchFindDealsByNumbers(
    numbers: string[],
  ): Promise<Map<string, { id: string; number: string }>> {
    const validNumbers = numbers.filter((n): n is string => Boolean(n));

    if (validNumbers.length === 0) {
      return new Map();
    }

    const existingDeals = await this.prisma.deal.findMany({
      where: {
        number: { in: validNumbers },
      },
      select: {
        id: true,
        number: true,
      },
    });

    const dealsMap = new Map<string, { id: string; number: string }>();

    existingDeals.forEach((deal) => {
      dealsMap.set(deal.number, deal);
    });

    return dealsMap;
  }

  /**
   * Batch поиск существующих компаний по name или email
   * 
   * @param names - Массив названий компаний
   * @param emails - Массив email адресов (уже нормализованных)
   * @returns Map с ключами "name:{name}" или "email:{email}" и значениями Company
   */
  async batchFindCompaniesByNameOrEmail(
    names: string[],
    emails: string[],
  ): Promise<Map<string, { id: string; name: string; email: string | null }>> {
    const validNames = names.filter((n): n is string => Boolean(n));
    const validEmails = emails.filter((e): e is string => Boolean(e));

    if (validNames.length === 0 && validEmails.length === 0) {
      return new Map();
    }

    const existingCompanies = await this.prisma.company.findMany({
      where: {
        OR: [
          ...(validNames.length > 0 ? [{ name: { in: validNames } }] : []),
          ...(validEmails.length > 0 ? [{ email: { in: validEmails } }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    const companiesMap = new Map<string, { id: string; name: string; email: string | null }>();

    existingCompanies.forEach((company) => {
      companiesMap.set(`name:${company.name}`, company);
      if (company.email) {
        companiesMap.set(`email:${company.email}`, company);
      }
    });

    return companiesMap;
  }

  /**
   * Batch создание контактов
   * 
   * @param contactsData - Массив данных для создания контактов
   * @param userId - ID пользователя, выполняющего импорт
   * @returns Результат операции с количеством созданных и обновленных контактов
   */
  async batchCreateContacts(
    contactsData: Array<{
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      position?: string | null;
      companyId?: string | null;
      companyName?: string | null;
      tags?: string[];
      notes?: string | null;
      social?: any;
    }>,
    userId: string,
  ): Promise<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    if (contactsData.length === 0) {
      return result;
    }

    // Нормализация данных
    const normalizedData = contactsData.map((row, index) => {
      try {
        const normalizedEmail = row.email ? normalizeEmail(row.email) : null;
        const normalizedPhone = row.phone ? normalizePhone(row.phone) : null;
        const normalizedSocial = row.social ? normalizeSocialLinks(row.social) : null;

        return {
          index,
          data: {
            fullName: row.fullName ? sanitizeTextFields(row.fullName) : undefined,
            email: normalizedEmail || undefined,
            phone: normalizedPhone || undefined,
            position: sanitizeOptionalTextFields(row.position),
            companyId: row.companyId || undefined,
            companyName: sanitizeOptionalTextFields(row.companyName),
            tags: row.tags || [],
            notes: sanitizeOptionalTextFields(row.notes),
            social: normalizedSocial || {},
          },
          lookupKey: normalizedEmail ? `email:${normalizedEmail}` : normalizedPhone ? `phone:${normalizedPhone}` : null,
        };
      } catch (error) {
        result.errors.push({
          row: index,
          error: error instanceof Error ? error.message : 'Normalization error',
        });
        return null;
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    // Batch поиск существующих контактов
    const emails = normalizedData.map((d) => d.data.email).filter(Boolean) as string[];
    const phones = normalizedData.map((d) => d.data.phone).filter(Boolean) as string[];
    const existingContactsMap = await this.batchFindContactsByEmailOrPhone(emails, phones);

    // Разделяем на новые и обновляемые
    const toCreate: Prisma.ContactCreateManyInput[] = [];
    const toUpdate: Array<{ id: string; data: Prisma.ContactUpdateInput }> = [];

    normalizedData.forEach((item) => {
      if (!item.lookupKey) {
        // Нет email и phone - только создание
        toCreate.push({
          ...item.data,
          social: item.data.social as Prisma.InputJsonValue,
        });
        return;
      }

      const existing = existingContactsMap.get(item.lookupKey);
      if (existing) {
        // Обновление существующего
        toUpdate.push({
          id: existing.id,
          data: {
            ...item.data,
            social: item.data.social as Prisma.InputJsonValue,
          },
        });
      } else {
        // Создание нового
        toCreate.push({
          ...item.data,
          social: item.data.social as Prisma.InputJsonValue,
        });
      }
    });

    // Обработка batch'ами в транзакциях
    const createBatches = this.chunkArray(toCreate, this.BATCH_SIZE);
    const updateBatches = this.chunkArray(toUpdate, this.BATCH_SIZE);

    // Batch создание
    for (const batch of createBatches) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await tx.contact.createMany({
              data: batch,
              skipDuplicates: true,
            });
          },
          {
            timeout: 30000, // 30 секунд на batch
            isolationLevel: 'ReadCommitted',
          },
        );
        result.created += batch.length;
      } catch (error) {
        result.errors.push({
          row: -1, // Batch error
          error: error instanceof Error ? error.message : 'Batch create error',
        });
      }
    }

    // Batch обновление
    for (const batch of updateBatches) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            // Prisma не поддерживает updateMany с разными данными для каждой записи
            // Используем Promise.all для параллельного обновления
            await Promise.all(
              batch.map((item) =>
                tx.contact.update({
                  where: { id: item.id },
                  data: {
            ...item.data,
            social: item.data.social as Prisma.InputJsonValue,
          },
                }),
              ),
            );
          },
          {
            timeout: 30000,
            isolationLevel: 'ReadCommitted',
          },
        );
        result.updated += batch.length;
      } catch (error) {
        result.errors.push({
          row: -1, // Batch error
          error: error instanceof Error ? error.message : 'Batch update error',
        });
      }
    }

    return result;
  }

  /**
   * Batch создание/обновление сделок
   * 
   * @param dealsData - Массив данных для создания/обновления сделок
   * @param userId - ID пользователя, создающего сделки
   * @returns Результат операции с количеством созданных и обновленных сделок
   */
  async batchCreateDeals(
    dealsData: Array<{
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
    }>,
    userId: string,
  ): Promise<{
    created: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    const result = {
      created: 0,
      updated: 0,
      errors: [] as Array<{ row: number; error: string }>,
    };

    if (dealsData.length === 0) {
      return result;
    }

    // Поиск существующих сделок по number
    const numbers = dealsData.map((d) => d.number).filter((n): n is string => Boolean(n));
    const existingDealsMap = await this.batchFindDealsByNumbers(numbers);

    // Разделяем на создание и обновление
    const toCreate: Prisma.DealCreateManyInput[] = [];
    const toUpdate: Array<{ id: string; data: Prisma.DealUpdateInput }> = [];

    dealsData.forEach((row, index) => {
      try {
        // ЖЕСТКАЯ ВАЛИДАЦИЯ: REQUIRED поля не могут быть пустыми
        if (!row.title || row.title.trim() === '') {
          result.errors.push({
            row: index,
            error: 'Title is required for deal import',
          });
          return; // Пропускаем эту строку
        }
        
        if (!row.pipelineId || row.pipelineId.trim() === '') {
          result.errors.push({
            row: index,
            error: 'Pipeline is required for deal import',
          });
          return; // Пропускаем эту строку
        }
        
        if (!row.stageId || row.stageId.trim() === '') {
          result.errors.push({
            row: index,
            error: 'Stage is required for deal import',
          });
          return; // Пропускаем эту строку
        }
        
        const existing = existingDealsMap.get(row.number);
        
        // CRITICAL: amount cannot be null in Prisma schema (has @default(0))
        // For create: use 0 if amount is null/undefined
        // For update: exclude amount from update data if it's null/undefined (don't overwrite existing value)
        const amountValue = row.amount !== undefined && row.amount !== null ? Number(row.amount) : null;
        const budgetValue = row.budget !== undefined && row.budget !== null ? Number(row.budget) : null;
        
        const baseDealData = {
          title: row.title, // НИКОГДА не используем fallback
          budget: budgetValue,
          pipelineId: row.pipelineId, // НИКОГДА не используем fallback
          stageId: row.stageId, // НИКОГДА не используем fallback
          assignedToId: row.assignedToId || null,
          contactId: row.contactId || null,
          companyId: row.companyId || null,
          expectedCloseAt: row.expectedCloseAt
            ? typeof row.expectedCloseAt === 'string'
              ? new Date(row.expectedCloseAt)
              : row.expectedCloseAt
            : null,
          description: row.description || null,
          tags: row.tags || [],
          rejectionReasons: row.rejectionReasons || [],
          reason: row.reason || null,
        };
        
        console.log(`[BATCH CREATE DEAL DATA] Row ${index + 1}:`, {
          number: row.number,
          title: baseDealData.title,
          amount: amountValue,
          budget: baseDealData.budget,
          description: baseDealData.description ? baseDealData.description.substring(0, 50) + '...' : null,
          tags: baseDealData.tags,
          rejectionReasons: baseDealData.rejectionReasons,
          reason: baseDealData.reason,
          assignedToId: baseDealData.assignedToId,
          contactId: baseDealData.contactId,
          companyId: baseDealData.companyId,
          expectedCloseAt: baseDealData.expectedCloseAt,
          isUpdate: !!existing,
        });

        if (existing) {
          // Обновление существующей сделки
          // CRITICAL: Don't include amount if it's null - Prisma doesn't allow null for amount
          // Only update amount if it has a valid value
          const updateData: any = { ...baseDealData };
          
          // CRITICAL: Only add amount if it has a valid numeric value
          if (amountValue !== null && amountValue !== undefined && !isNaN(Number(amountValue))) {
            updateData.amount = Number(amountValue);
          }
          // Explicitly ensure amount is NOT in updateData if it's null/undefined
          // This prevents Prisma from trying to set amount to null
          
          // Log update data to verify amount is not included
          console.log(`[BATCH UPDATE DATA] Row ${index + 1}, Deal ${existing.id}:`, {
            hasAmount: 'amount' in updateData,
            amountValue: 'amount' in updateData ? updateData.amount : 'NOT INCLUDED',
            updateDataKeys: Object.keys(updateData),
          });
          
          toUpdate.push({
            id: existing.id,
            data: updateData,
          });
        } else {
          // Создание новой сделки
          // CRITICAL: amount must be 0 (not null) for new deals
          toCreate.push({
            number: row.number,
            ...baseDealData,
            amount: amountValue !== null && amountValue !== undefined ? amountValue : 0,
            createdById: userId,
          });
        }
      } catch (error) {
        // CRITICAL: Log Prisma error with full details
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'N/A';
        console.error('[DEAL DATA PREPARATION ERROR] Prisma error in data preparation:', {
          error: errorMessage,
          stack: errorStack,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          prismaError: error,
          rowIndex: index,
          dealData: {
            number: row.number,
            title: row.title,
            pipelineId: row.pipelineId,
            stageId: row.stageId,
          },
        });
        // CRITICAL: Add to errors
        result.errors.push({
          row: index,
          error: `Data preparation error: ${errorMessage}`,
        });
      }
    });

    // Batch создание
    const createBatches = this.chunkArray(toCreate, this.BATCH_SIZE);
    console.log('[BATCH CREATE DEALS] Starting batch creation:', {
      totalDeals: toCreate.length,
      batches: createBatches.length,
      batchSize: this.BATCH_SIZE,
      sampleDeal: toCreate[0] ? {
        number: toCreate[0].number,
        title: toCreate[0].title,
        pipelineId: toCreate[0].pipelineId,
        stageId: toCreate[0].stageId,
      } : null,
    });
    
    for (let batchIndex = 0; batchIndex < createBatches.length; batchIndex++) {
      const batch = createBatches[batchIndex];
      try {
        console.log(`[BATCH CREATE DEALS] Processing batch ${batchIndex + 1}/${createBatches.length}:`, {
          batchSize: batch.length,
          sampleDeal: batch[0] ? {
            number: batch[0].number,
            title: batch[0].title,
            pipelineId: batch[0].pipelineId,
            stageId: batch[0].stageId,
          } : null,
        });
        
        // CRITICAL: Use the actual count from createMany, not batch.length
        // createMany returns { count: number } - the actual number of created records
        const createResult = await this.prisma.$transaction(
          async (tx) => {
            // CRITICAL: Check for duplicates BEFORE createMany to get accurate count
            const batchNumbers = batch.map(d => d.number);
            const existingInBatch = await tx.deal.findMany({
              where: { number: { in: batchNumbers } },
              select: { number: true },
            });
            const existingNumbersSet = new Set(existingInBatch.map(d => d.number));
            
            // Log each deal before createMany
            batch.forEach((deal, dealIndex) => {
              console.log('[IMPORT CREATE DEAL]', {
                title: deal.title,
                pipelineId: deal.pipelineId,
                stageId: deal.stageId,
                ownerId: deal.assignedToId || null,
                row: dealIndex + 1, // Index in batch (1-based)
                batchIndex: batchIndex + 1,
                number: deal.number,
              });
            });
            
            const createResult = await tx.deal.createMany({
              data: batch,
              skipDuplicates: true,
            });
            
            // ВАЛИДАЦИЯ РЕЗУЛЬТАТА: Если createMany вернул 0, но строки были переданы - это ошибка
            if (createResult.count === 0 && batch.length > 0) {
              console.error('[DEAL CREATE FAILED] createMany returned 0 but rows were provided:', {
                batchSize: batch.length,
                batchIndex: batchIndex + 1,
                sampleDeal: batch[0] ? {
                  number: batch[0].number,
                  title: batch[0].title,
                  pipelineId: batch[0].pipelineId,
                  stageId: batch[0].stageId,
                } : null,
              });
              throw new Error(`createMany returned 0 but ${batch.length} rows were provided. Possible FK constraint violation or duplicate numbers.`);
            }
            
            const actuallyCreated = createResult.count;
            const skipped = batch.length - actuallyCreated;
            
            console.log(`[BATCH CREATE DEALS] Batch ${batchIndex + 1} result:`, {
              batchSize: batch.length,
              actuallyCreated,
              skipped,
              existingInDB: existingNumbersSet.size,
              sampleExisting: Array.from(existingNumbersSet).slice(0, 3),
            });
            
            if (skipped > 0) {
              console.warn(`[BATCH CREATE DEALS] WARNING: ${skipped} deals were skipped (duplicates or errors)`);
            }
            
            return createResult;
          },
          {
            timeout: 30000,
            isolationLevel: 'ReadCommitted',
          },
        );
        
        // CRITICAL: Use actual count from createMany, not batch.length
        result.created += createResult.count;
      } catch (error) {
        // CRITICAL: Log Prisma error with full details
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'N/A';
        console.error('[DEAL CREATE FAILED] Prisma error in batch create:', {
          error: errorMessage,
          stack: errorStack,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          prismaError: error,
          batchIndex: batchIndex + 1,
          batchSize: batch.length,
          totalBatches: createBatches.length,
          sampleDeal: batch[0] ? {
            number: batch[0].number,
            title: batch[0].title,
            pipelineId: batch[0].pipelineId,
            stageId: batch[0].stageId,
          } : null,
        });
        // CRITICAL: Add each deal in batch to errors and increase failed count
        batch.forEach((deal, dealIndex) => {
          result.errors.push({
            row: -1, // Batch error - row number not available
            error: `Batch create failed: ${errorMessage}`,
          });
        });
        // CRITICAL: Increase failed count for all deals in failed batch
        // Don't throw - continue processing other batches
        console.error('[DEAL CREATE FAILED] Batch failed, but continuing with other batches');
      }
    }

    // Batch обновление
    const updateBatches = this.chunkArray(toUpdate, this.BATCH_SIZE);
    for (const batch of updateBatches) {
      try {
        // CRITICAL: Filter out amount from update data if it's null/undefined
        // Prisma doesn't allow null for amount field
        const sanitizedBatch = batch.map((item) => {
          const sanitizedData: any = { ...item.data };
          
          // Remove amount if it's null, undefined, or NaN
          if ('amount' in sanitizedData && (sanitizedData.amount === null || sanitizedData.amount === undefined || isNaN(Number(sanitizedData.amount)))) {
            delete sanitizedData.amount;
            console.log(`[BATCH UPDATE SANITIZE] Removed null/undefined amount from deal ${item.id}`);
          }
          
          return {
            id: item.id,
            data: sanitizedData,
          };
        });
        
        await this.prisma.$transaction(
          async (tx) => {
            await Promise.all(
              sanitizedBatch.map((item) =>
                tx.deal.update({
                  where: { id: item.id },
                  data: item.data,
                }),
              ),
            );
          },
          {
            timeout: 30000,
            isolationLevel: 'ReadCommitted',
          },
        );
        result.updated += batch.length;
      } catch (error) {
        // CRITICAL: Log Prisma error with full details
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : 'N/A';
        console.error('[DEAL UPDATE FAILED] Prisma error in batch update:', {
          error: errorMessage,
          stack: errorStack,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          prismaError: error,
          batchSize: batch.length,
          sampleUpdate: batch[0] ? {
            id: batch[0].id,
            dataKeys: Object.keys(batch[0].data || {}),
          } : null,
        });
        // CRITICAL: Add each deal in batch to errors
        batch.forEach((item) => {
          result.errors.push({
            row: -1, // Batch error - row number not available
            error: `Batch update failed: ${errorMessage}`,
          });
        });
        // CRITICAL: Decrease updated count (we counted them before, but update failed)
        // Don't increase failed here - it's already counted in errors
        // But we need to adjust updated count
        result.updated = Math.max(0, result.updated - batch.length);
      }
    }

    return result;
  }

  /**
   * Вспомогательная функция для разбиения массива на chunks
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

