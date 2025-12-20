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
        const existing = existingDealsMap.get(row.number);
        const dealData = {
          title: row.title || 'New Deal',
          amount: row.amount !== undefined && row.amount !== null ? Number(row.amount) : 0,
          budget: row.budget !== undefined && row.budget !== null ? Number(row.budget) : null,
          pipelineId: row.pipelineId,
          stageId: row.stageId,
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
        };

        if (existing) {
          // Обновление существующей сделки
          toUpdate.push({
            id: existing.id,
            data: dealData,
          });
        } else {
          // Создание новой сделки
          toCreate.push({
            number: row.number,
            ...dealData,
            createdById: userId,
          });
        }
      } catch (error) {
        result.errors.push({
          row: index,
          error: error instanceof Error ? error.message : 'Data preparation error',
        });
      }
    });

    // Batch создание
    const createBatches = this.chunkArray(toCreate, this.BATCH_SIZE);
    for (const batch of createBatches) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await tx.deal.createMany({
              data: batch,
              skipDuplicates: true,
            });
          },
          {
            timeout: 30000,
            isolationLevel: 'ReadCommitted',
          },
        );
        result.created += batch.length;
      } catch (error) {
        result.errors.push({
          row: -1,
          error: error instanceof Error ? error.message : 'Batch create error',
        });
      }
    }

    // Batch обновление
    const updateBatches = this.chunkArray(toUpdate, this.BATCH_SIZE);
    for (const batch of updateBatches) {
      try {
        await this.prisma.$transaction(
          async (tx) => {
            await Promise.all(
              batch.map((item) =>
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
        result.errors.push({
          row: -1,
          error: error instanceof Error ? error.message : 'Batch update error',
        });
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

