# CSV Import Tests

## Настройка тестовой БД

### 1. Создать тестовую БД

```bash
# В .env или .env.test
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/crm_test"
```

### 2. Применить миграции к тестовой БД

```bash
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
```

### 3. Запустить тесты

```bash
# Все тесты
npm test

# Только CSV импорт тесты
npm test -- csv-import.service.spec.ts

# Только batch тесты
npm test -- import-batch.service.spec.ts

# С coverage
npm test -- --coverage
```

---

## Структура тестов

### csv-import.service.spec.ts

**Тесты для importContacts():**
- ✅ Импорт 3 новых контактов
- ✅ Update существующего по email
- ✅ Поиск по phone если нет email
- ✅ Пропуск строки с пустым именем
- ✅ Нормализация email / phone
- ✅ Корректный importResult (created / updated / failed)
- ✅ Обработка tags
- ✅ Обработка social links

**Тесты для importDeals():**
- ✅ Импорт сделки с существующим contact (email)
- ✅ Обработка если contact не найден
- ✅ Batch > 1000 строк
- ✅ Транзакция на batch
- ✅ Обработка ошибок валидации
- ✅ Обработка даты в expectedCloseAt
- ✅ Обработка tags

### import-batch.service.spec.ts

**Тесты для batchFindContactsByEmailOrPhone():**
- ✅ Поиск по email
- ✅ Поиск по phone
- ✅ Поиск по email или phone
- ✅ Пустой результат

**Тесты для batchCreateContacts():**
- ✅ Batch создание контактов
- ✅ Обновление существующих
- ✅ Обработка ошибок нормализации
- ✅ Batch > 1000 контактов

**Тесты для batchCreateDeals():**
- ✅ Batch создание сделок
- ✅ Batch > 1000 сделок
- ✅ Пропуск дубликатов (skipDuplicates)

---

## Особенности

- ✅ **Реальная БД** - не мокается Prisma
- ✅ **Изолированная** - очистка БД перед каждым тестом
- ✅ **CSV из string** - не используются реальные файлы
- ✅ **Streaming** - тестируется через Readable stream

---

## Пример запуска

```bash
# Установить зависимости (если нужно)
npm install

# Настроить тестовую БД
export TEST_DATABASE_URL="postgresql://user:password@localhost:5432/crm_test"
npx prisma migrate deploy

# Запустить тесты
npm test -- csv-import.service.spec.ts --verbose
```

---

## Troubleshooting

### Ошибка подключения к БД

Убедитесь, что:
- `TEST_DATABASE_URL` или `DATABASE_URL` установлен
- БД существует и доступна
- Миграции применены

### Ошибки unique constraints

Тесты очищают БД перед каждым тестом. Если ошибки persist:
- Проверьте, что `beforeEach` выполняется
- Убедитесь, что нет параллельных тестов

### Timeout ошибки

Для больших batch тестов (>1000 строк) может потребоваться увеличить timeout:

```typescript
jest.setTimeout(30000); // 30 секунд
```

