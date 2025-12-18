# CSV Import Examples

## 1. Структура DTO

### ContactFieldMapping

```typescript
{
  fullName: "Имя",           // CSV column: "Имя"
  email: "Email",            // CSV column: "Email"
  phone: "Телефон",          // CSV column: "Телефон"
  position: "Должность",      // CSV column: "Должность"
  companyName: "Компания",   // CSV column: "Компания"
  tags: "Теги",              // CSV column: "Теги" (разделенные запятой)
  notes: "Заметки",          // CSV column: "Заметки"
  social: {
    instagram: "Instagram",   // CSV column: "Instagram"
    telegram: "Telegram",     // CSV column: "Telegram"
    whatsapp: "WhatsApp",     // CSV column: "WhatsApp"
    vk: "VK",                 // CSV column: "VK"
  }
}
```

### DealFieldMapping

```typescript
{
  number: "Номер сделки",           // CSV column: "Номер сделки"
  title: "Название",                // CSV column: "Название"
  amount: "Сумма",                  // CSV column: "Сумма"
  budget: "Бюджет",                 // CSV column: "Бюджет"
  pipelineId: "Pipeline ID",        // CSV column: "Pipeline ID"
  stageId: "Stage ID",               // CSV column: "Stage ID"
  assignedToId: "Ответственный",    // CSV column: "Ответственный"
  contactId: "Contact ID",          // CSV column: "Contact ID" (опционально)
  email: "Email контакта",          // CSV column: "Email контакта" (для резолва contactId)
  phone: "Телефон контакта",        // CSV column: "Телефон контакта" (для резолва contactId)
  companyId: "Company ID",          // CSV column: "Company ID"
  expectedCloseAt: "Дата закрытия", // CSV column: "Дата закрытия"
  description: "Описание",          // CSV column: "Описание"
  tags: "Теги",                     // CSV column: "Теги"
}
```

---

## 2. Пример JSON Mapping

### Для контактов:

```json
{
  "entityType": "contact",
  "contactMapping": {
    "fullName": "Имя",
    "email": "Email",
    "phone": "Телефон",
    "position": "Должность",
    "companyName": "Компания",
    "tags": "Теги",
    "notes": "Заметки",
    "social": {
      "instagram": "Instagram",
      "telegram": "Telegram",
      "whatsapp": "WhatsApp",
      "vk": "VK"
    }
  }
}
```

### Для сделок:

```json
{
  "entityType": "deal",
  "dealMapping": {
    "number": "Номер сделки",
    "title": "Название",
    "amount": "Сумма",
    "pipelineId": "Pipeline ID",
    "stageId": "Stage ID",
    "assignedToId": "Ответственный",
    "email": "Email контакта",
    "phone": "Телефон контакта",
    "expectedCloseAt": "Дата закрытия",
    "description": "Описание",
    "tags": "Теги"
  }
}
```

---

## 3. Пример CSV для контактов

```csv
Имя,Email,Телефон,Должность,Компания,Теги,Заметки,Instagram,Telegram
Иван Иванов,ivan@example.com,+79991234567,Менеджер,ООО Рога и Копыта,vip,Важный клиент,ivan_inst,ivan_tg
Петр Петров,petr@example.com,+79997654321,Директор,ООО Тест,regular,Новый клиент,petr_inst,
Мария Сидорова,maria@example.com,,Бухгалтер,ООО Рога и Копыта,regular,,
```

**Примечания:**
- Разделитель: `,` или `;`
- UTF-8 кодировка
- Первая строка - заголовки
- Пустые значения допустимы (кроме fullName и email/phone)

---

## 4. Пример CSV для сделок

```csv
Номер сделки,Название,Сумма,Pipeline ID,Stage ID,Ответственный,Email контакта,Телефон контакта,Дата закрытия,Описание,Теги
DEAL-001,Продажа оборудования,100000,pipeline-id-1,stage-id-1,user-id-1,ivan@example.com,,2024-12-31,Крупная сделка,vip
DEAL-002,Консультация,50000,pipeline-id-1,stage-id-2,user-id-2,petr@example.com,+79997654321,2024-11-30,Консультационные услуги,regular
DEAL-003,Поддержка,25000,pipeline-id-2,stage-id-3,user-id-1,,+79991234567,,Техническая поддержка,regular
```

**Примечания:**
- `Email контакта` или `Телефон контакта` используются для автоматического резолва `contactId`
- Если указан `Contact ID` напрямую, он имеет приоритет
- `Дата закрытия` в формате ISO (YYYY-MM-DD) или любой формат, который понимает `new Date()`

---

## 5. Пример использования в коде

```typescript
import { CsvImportService } from '@/import-export/csv-import.service';
import { createReadStream } from 'fs';

// Импорт контактов
const fileStream = createReadStream('contacts.csv');
const mapping = {
  fullName: "Имя",
  email: "Email",
  phone: "Телефон",
  position: "Должность",
  companyName: "Компания",
  tags: "Теги",
};

const result = await csvImportService.importContacts(
  fileStream,
  mapping,
  userId
);

console.log(`Создано: ${result.summary.created}`);
console.log(`Обновлено: ${result.summary.updated}`);
console.log(`Ошибок: ${result.summary.failed}`);
console.log(`Ошибки:`, result.errors);
```

---

## 6. Формат результата

```typescript
{
  summary: {
    total: 1000,      // Всего строк обработано
    created: 750,     // Создано новых
    updated: 200,     // Обновлено существующих
    failed: 50,       // Ошибок
    skipped: 0        // Пропущено
  },
  errors: [
    {
      row: 5,         // Номер строки в CSV
      field: "email",
      value: "invalid-email",
      error: "Invalid email format"
    },
    {
      row: 10,
      field: "fullName",
      error: "Full name is required"
    }
  ]
}
```

---

## 7. Обработка ошибок

- **Не падает на одной ошибке** - продолжает обработку остальных строк
- **Собирает все ошибки** - возвращает полный список в результате
- **Валидация на уровне строки** - проверяет обязательные поля перед добавлением в batch
- **Batch ошибки** - если batch операция упала, ошибки помечаются как `row: -1`

---

## 8. Особенности

- ✅ **Streaming парсинг** - обрабатывает файлы любого размера
- ✅ **UTF-8** - автоматическая поддержка
- ✅ **Разделители** - поддержка `,` и `;`
- ✅ **Нормализация** - автоматическая нормализация email, phone, social links
- ✅ **Batch обработка** - 1000 строк за раз в транзакциях
- ✅ **Резолв контактов** - автоматический поиск contactId по email/phone при импорте сделок

