# Import Batch Service

Изолированный сервис для массового импорта данных без side-effects.

## Особенности

- ✅ **Изолирован** - НЕ использует `contactsService.create()`, `dealsService.create()`
- ✅ **Без side-effects** - НЕТ WebSocket событий, НЕТ `getStats()`, НЕТ activity логов
- ✅ **Batch операции** - Использует `createMany()` и транзакции
- ✅ **Оптимизирован** - Batch size = 1000, один запрос для поиска существующих

## Использование

### 1. Batch поиск существующих контактов

```typescript
const emails = ['user1@example.com', 'user2@example.com'];
const phones = ['+79991234567', '+79997654321'];

const existingMap = await importBatchService.batchFindContactsByEmailOrPhone(emails, phones);

// Проверка существования
const contact = existingMap.get('email:user1@example.com');
if (contact) {
  // Контакт существует
}
```

### 2. Batch создание контактов

```typescript
const contactsData = [
  {
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+79991234567',
    position: 'Manager',
    tags: ['vip'],
  },
  // ... еще контакты
];

const result = await importBatchService.batchCreateContacts(contactsData, userId);

console.log(`Created: ${result.created}, Updated: ${result.updated}`);
console.log(`Errors: ${result.errors.length}`);
```

### 3. Batch создание сделок

```typescript
const dealsData = [
  {
    number: 'DEAL-001',
    title: 'New Deal',
    amount: 10000,
    pipelineId: 'pipeline-id',
    stageId: 'stage-id',
    contactId: 'contact-id',
  },
  // ... еще сделки
];

const result = await importBatchService.batchCreateDeals(dealsData, userId);

console.log(`Created: ${result.created}`);
console.log(`Errors: ${result.errors.length}`);
```

## Batch операции

- **Batch size**: 1000 записей
- **Транзакции**: Каждый batch выполняется в отдельной транзакции
- **Timeout**: 30 секунд на batch
- **Isolation level**: ReadCommitted

## Обработка ошибок

Все ошибки собираются в массив `errors` с указанием номера строки и сообщения об ошибке:

```typescript
{
  row: 5, // Номер строки в исходных данных (или -1 для batch ошибок)
  error: 'Error message'
}
```

## Нормализация данных

Сервис автоматически нормализует:
- Email адреса (trim, toLowerCase, валидация)
- Телефонные номера (E.164 format)
- Социальные ссылки (Instagram, Telegram, WhatsApp, VK, LinkedIn)
- Текстовые поля (trim, удаление лишних пробелов)

## Важно

- **НЕ используйте** для обычных операций создания/обновления
- **Используйте только** для массового импорта CSV
- **Проверяйте** результат на наличие ошибок
- **Обрабатывайте** дубликаты через `skipDuplicates: true`

