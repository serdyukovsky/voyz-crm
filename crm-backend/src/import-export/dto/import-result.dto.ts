/**
 * Import Result DTO
 * 
 * Результат импорта CSV с детальной статистикой
 */

export interface ImportError {
  row: number; // Номер строки в CSV (1-based, включая header)
  field?: string; // Поле, где произошла ошибка
  value?: string; // Значение, которое вызвало ошибку
  error: string; // Сообщение об ошибке
}

export interface ImportSummary {
  total: number; // Всего строк обработано
  created: number; // Создано новых записей
  updated: number; // Обновлено существующих записей
  failed: number; // Ошибок
  skipped: number; // Пропущено (пустые строки, дубликаты)
}

export interface ImportResultDto {
  summary: ImportSummary;
  errors: ImportError[];
  warnings?: string[]; // Предупреждения (не критичные)
}

