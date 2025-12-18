# Import/Export Page Tests

## Структура тестов

### page.test.tsx
E2E тесты для страницы импорта/экспорта:
- Рендер страницы
- Переключение табов
- Загрузка CSV
- Preview таблица
- Mapping форма
- Start Import
- Результат импорта

### import-uploader.test.tsx
Тесты для компонента загрузки файлов:
- Отображение input
- Принятие только CSV
- Парсинг CSV
- Вызов callback

### column-mapping.test.tsx
Тесты для формы mapping:
- Отображение select для каждой колонки
- Изменение mapping
- Кнопка Start Import
- Disabled состояние

---

## Покрытие

### ✅ Рендер страницы
- Заголовок отображается
- Табы Import/Export отображаются
- Переключение между табами работает

### ✅ Загрузка CSV
- Input для файла отображается
- Только CSV файлы принимаются
- Парсинг CSV работает
- Preview данные передаются

### ✅ Preview колонок
- Таблица preview отображается
- Имя файла отображается
- Количество строк отображается

### ✅ Mapping UI
- Форма mapping отображается
- Select для каждой колонки
- Не хардкодит поля
- Изменение mapping работает

### ✅ Start Import
- Кнопка отображается
- Кнопка disabled во время импорта
- Вызов API при клике

### ✅ Отображение результата
- Summary отображается
- Ошибки отображаются
- Все поля summary корректны

---

## Запуск

```bash
# Все тесты
npm test

# Только import-export тесты
npm test __tests__/import-export

# С coverage
npm test -- --coverage
```

---

## Требования

- `vitest` - test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/user-event` - User interaction simulation
- `msw` - API mocking
- `@tanstack/react-query` - Query client for API calls

---

## Особенности

- ✅ **MSW для API** - мокирование API запросов
- ✅ **Не хардкодит поля** - использует переданные колонки
- ✅ **Не тестирует стили** - только функциональность
- ✅ **Проверка disabled** - кнопка disabled во время импорта
- ✅ **Проверка ошибок** - ошибки отображаются
- ✅ **Проверка summary** - все поля корректны

