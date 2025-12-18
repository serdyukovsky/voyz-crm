# CSV Import Service - Usage Guide

## Быстрый старт

### 1. Импорт контактов

```typescript
import { CsvImportService } from '@/import-export/csv-import.service';
import { createReadStream } from 'fs';

const csvImportService = new CsvImportService(importBatchService);

// Маппинг полей
const mapping = {
  fullName: "Имя",
  email: "Email",
  phone: "Телефон",
  position: "Должность",
  companyName: "Компания",
  tags: "Теги",
};

// Импорт
const fileStream = createReadStream('contacts.csv');
const result = await csvImportService.importContacts(
  fileStream,
  mapping,
  userId,
  ',' // разделитель: ',' или ';'
);

console.log(result.summary);
console.log(result.errors);
```

### 2. Импорт сделок

```typescript
// Сначала нужно получить Map контактов для резолва contactId
const emails = ['ivan@example.com', 'petr@example.com'];
const phones = ['+79991234567', '+79997654321'];
const contactMap = await importBatchService.batchFindContactsByEmailOrPhone(emails, phones);

// Создаем Map для резолва contactId
const contactEmailPhoneMap = new Map<string, string>();
contactMap.forEach((contact, key) => {
  contactEmailPhoneMap.set(key, contact.id);
});

// Маппинг полей
const mapping = {
  number: "Номер сделки",
  title: "Название",
  amount: "Сумма",
  pipelineId: "Pipeline ID",
  stageId: "Stage ID",
  email: "Email контакта", // для резолва contactId
  phone: "Телефон контакта", // для резолва contactId
};

// Импорт
const fileStream = createReadStream('deals.csv');
const result = await csvImportService.importDeals(
  fileStream,
  mapping,
  userId,
  contactEmailPhoneMap, // опционально, для резолва contactId
  ','
);
```

---

## Структура результата

```typescript
{
  summary: {
    total: 1000,    // Всего строк обработано
    created: 750,   // Создано новых
    updated: 200,   // Обновлено существующих (только для контактов)
    failed: 50,     // Ошибок
    skipped: 0      // Пропущено
  },
  errors: [
    {
      row: 5,                    // Номер строки в CSV (1-based)
      field: "email",           // Поле с ошибкой
      value: "invalid-email",    // Значение, вызвавшее ошибку
      error: "Invalid email format"
    }
  ]
}
```

---

## Особенности

- ✅ **Streaming** - обрабатывает файлы любого размера
- ✅ **UTF-8** - автоматическая поддержка
- ✅ **Разделители** - поддержка `,` и `;`
- ✅ **Нормализация** - автоматическая нормализация email, phone
- ✅ **Batch** - 1000 строк за раз в транзакциях
- ✅ **Ошибки** - не падает на одной ошибке, собирает все

---

## Примеры файлов

См. `examples/contacts-example.csv` и `examples/deals-example.csv`

