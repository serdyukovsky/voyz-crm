import { Injectable } from '@nestjs/common';

/**
 * Auto-mapping Service
 * 
 * Автоматическое сопоставление CSV колонок с полями CRM
 * Использует нормализацию, словарь синонимов и алгоритм matching с confidence scores
 */
@Injectable()
export class AutoMappingService {
  /**
   * Словарь синонимов для полей CRM
   * Ключ - нормализованное поле CRM, значение - массив синонимов
   */
  private readonly synonyms: Record<string, string[]> = {
    email: ['email', 'e-mail', 'mail', 'e mail', 'email address', 'emailaddress'],
    phone: ['phone', 'tel', 'telephone', 'mobile', 'cell', 'cellphone', 'phone number', 'phonenumber'],
    fullName: ['name', 'full name', 'fio', 'fullname', 'full_name', 'contact name', 'contactname', 'person name', 'personname'],
    companyName: ['company', 'organization', 'org', 'organisation', 'company name', 'companyname', 'organization name', 'organizationname'],
    position: ['position', 'job title', 'jobtitle', 'job', 'role', 'title', 'job position', 'jobposition'],
    tags: ['tags', 'tag', 'labels', 'label', 'categories', 'category'],
    notes: ['notes', 'note', 'comments', 'comment', 'description', 'desc', 'remarks', 'remark'],
    telegram: ['tg', 'telegram', 'telegram username', 'telegramusername', 'telegram id', 'telegramid'],
    instagram: ['instagram', 'insta', 'ig', 'instagram username', 'instagramusername'],
    whatsapp: ['whatsapp', 'wa', 'whats app', 'whatsapp number', 'whatsappnumber'],
    vk: ['vk', 'vkontakte', 'vk id', 'vkid', 'vk page', 'vkpage'],
    // Для сделок
    number: ['number', 'deal number', 'dealnumber', 'deal id', 'dealid', 'deal_id', 'deal number', 'deal_number'],
    title: ['title', 'deal title', 'dealtitle', 'deal title', 'deal_title', 'name', 'deal name', 'dealname'],
    amount: ['amount', 'sum', 'value', 'price', 'cost', 'total', 'deal amount', 'dealamount', 'deal amount', 'deal_amount'],
    budget: ['budget', 'planned', 'planned amount', 'plannedamount', 'planned amount', 'planned_amount'],
    description: ['description', 'desc', 'details', 'detail', 'deal description', 'dealdescription', 'deal description', 'deal_description'],
    expectedCloseAt: ['expected close', 'expectedclose', 'expected close date', 'expectedclosedate', 'close date', 'closedate', 'closing date', 'closingdate', 'deadline'],
    rejectionReasons: ['rejection reasons', 'rejectionreasons', 'rejection_reasons', 'причина отказа', 'причинаотказа', 'причина_отказа', 'rejection reason', 'rejectionreason', 'rejection_reason', 'отказ', 'reasons', 'rejection'],
    reason: ['reason', 'причина', 'основание', 'cause'],
  };

  /**
   * Транслитерация русских символов в латиницу
   */
  private transliterate(str: string): string {
    const translitMap: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };
    
    return str
      .toLowerCase()
      .split('')
      .map(char => translitMap[char] || char)
      .join('');
  }

  /**
   * Нормализация строки для сравнения
   * - lowercase
   * - trim
   * - transliterate Russian to Latin
   * - remove symbols (_ - .)
   * - remove spaces (для exact match)
   */
  private normalize(str: string): string {
    const transliterated = this.transliterate(str);
    return transliterated
      .trim()
      .replace(/[_.-\s]/g, ''); // Удаляем все пробелы и символы для точного сравнения
  }

  /**
   * Проверка exact match (точное совпадение после нормализации)
   */
  private isExactMatch(normalizedColumn: string, normalizedField: string): boolean {
    return normalizedColumn === normalizedField;
  }

  /**
   * Проверка synonym match (совпадение с синонимом)
   */
  private isSynonymMatch(normalizedColumn: string, fieldKey: string): boolean {
    const fieldSynonyms = this.synonyms[fieldKey] || [];
    return fieldSynonyms.some(synonym => this.normalize(synonym) === normalizedColumn);
  }

  /**
   * Проверка partial match (частичное совпадение)
   * Возвращает true если нормализованная колонка содержит поле или наоборот
   * Использует нормализацию с пробелами для частичного совпадения
   */
  private isPartialMatch(columnName: string, fieldKey: string): boolean {
    const normalizedColumn = columnName.toLowerCase().trim().replace(/[_.-]/g, '');
    const normalizedField = fieldKey.toLowerCase().trim().replace(/[_.-]/g, '');
    // Для partial match проверяем с пробелами
    const columnWithSpaces = normalizedColumn.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    const fieldWithSpaces = normalizedField.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
    
    return columnWithSpaces.includes(fieldWithSpaces) || 
           fieldWithSpaces.includes(columnWithSpaces) ||
           normalizedColumn.includes(normalizedField) || 
           normalizedField.includes(normalizedColumn);
  }

  /**
   * Автоматическое сопоставление CSV колонок с полями CRM
   * 
   * @param csvColumns - Массив названий колонок из CSV
   * @param entityType - Тип сущности ('contact' | 'deal')
   * @returns Массив предложений маппинга с confidence scores
   */
  autoMapColumns(
    csvColumns: string[],
    entityType: 'contact' | 'deal',
  ): Array<{
    columnName: string;
    suggestedField: string | null;
    confidence: number;
  }> {
    // Определяем доступные поля в зависимости от типа сущности
    const availableFields = this.getAvailableFields(entityType);

    return csvColumns.map((columnName) => {
      const normalizedColumn = this.normalize(columnName);
      let bestMatch: { field: string; confidence: number } | null = null;

      // Проверяем каждое доступное поле
      for (const fieldKey of availableFields) {
        const normalizedField = this.normalize(fieldKey);
        let confidence = 0;

        // 1. Exact match → confidence 1.0
        if (this.isExactMatch(normalizedColumn, normalizedField)) {
          confidence = 1.0;
        }
        // 2. Synonym match → 0.8 (проверяем до partial, так как синонимы более точные)
        else if (this.isSynonymMatch(normalizedColumn, fieldKey)) {
          confidence = 0.8;
        }
        // 3. Partial match → 0.6 (только если не exact и не synonym)
        else if (normalizedColumn.length > 0 && this.isPartialMatch(columnName, fieldKey)) {
          confidence = 0.6;
        }

        // Сохраняем лучшее совпадение
        if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = { field: fieldKey, confidence };
        }
      }

      return {
        columnName,
        suggestedField: bestMatch?.field || null,
        confidence: bestMatch?.confidence || 0,
      };
    });
  }

  /**
   * Получение списка доступных полей для типа сущности
   */
  private getAvailableFields(entityType: 'contact' | 'deal'): string[] {
    if (entityType === 'contact') {
      return [
        'fullName',
        'email',
        'phone',
        'position',
        'companyName',
        'tags',
        'notes',
        'telegram',
        'instagram',
        'whatsapp',
        'vk',
      ];
    } else {
      return [
        'number',
        'title',
        'amount',
        'budget',
        'pipelineId',
        'stageId',
        'assignedToId',
        'contactId',
        'companyId',
        'expectedCloseAt',
        'description',
        'tags',
        'rejectionReasons',
        'reason',
      ];
    }
  }

  /**
   * Получение всех синонимов для поля (для тестирования)
   */
  getSynonyms(fieldKey: string): string[] {
    return this.synonyms[fieldKey] || [];
  }
}

