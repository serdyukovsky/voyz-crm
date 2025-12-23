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

export interface StageToCreate {
  name: string; // Имя стадии из CSV
  order: number; // Порядок по первому появлению в CSV
}

export interface ImportResultDto {
  summary: ImportSummary;
  errors: ImportError[]; // Row-specific errors (row >= 0)
  globalErrors?: string[]; // Global errors (not tied to specific rows)
  warnings?: string[]; // Предупреждения (не критичные)
  stagesToCreate?: StageToCreate[]; // Стадии, которые будут созданы при импорте
}

