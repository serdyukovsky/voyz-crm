# Import/Export Page Tests - Summary

## Созданные файлы

1. **`__tests__/setup.ts`** - Настройка тестового окружения
2. **`__tests__/mocks/handlers.ts`** - MSW handlers для API мокирования
3. **`__tests__/mocks/server.ts`** - MSW server setup
4. **`__tests__/import-export/page.test.tsx`** - E2E тесты страницы
5. **`__tests__/import-export/import-uploader.test.tsx`** - Тесты компонента загрузки
6. **`__tests__/import-export/column-mapping.test.tsx`** - Тесты формы mapping
7. **`vitest.config.ts`** - Конфигурация Vitest
8. **`package.json.test-deps.json`** - Необходимые зависимости

---

## Покрытие тестами

### page.test.tsx - 12 тестов

1. ✅ **Рендер страницы с заголовком**
2. ✅ **Отображение табов Import и Export**
3. ✅ **Переключение между табами**
4. ✅ **Отображение загрузчика файла**
5. ✅ **Обработка загрузки CSV файла**
6. ✅ **Отображение preview таблицы**
7. ✅ **Отображение формы mapping**
8. ✅ **Отображение select для каждой колонки**
9. ✅ **Отображение кнопки Start Import**
10. ✅ **Кнопка disabled во время импорта**
11. ✅ **Отображение результата импорта**
12. ✅ **Отображение ошибок**

### import-uploader.test.tsx - 4 теста

1. ✅ **Отображение input для загрузки файла**
2. ✅ **Принятие только CSV файлов**
3. ✅ **Вызов onFileUpload при выборе файла**
4. ✅ **Парсинг CSV и передача preview данных**

### column-mapping.test.tsx - 7 тестов

1. ✅ **Отображение формы mapping**
2. ✅ **Отображение select для каждой колонки**
3. ✅ **Вызов onMappingChange при изменении**
4. ✅ **Отображение кнопки Start Import**
5. ✅ **Кнопка disabled во время импорта**
6. ✅ **Вызов onStartImport при клике**
7. ✅ **Не хардкодит поля - использует переданные колонки**

---

## Проверки

### ✅ Кнопка disabled во время импорта
- Проверяется состояние `isImporting`
- Кнопка становится disabled
- Текст меняется на "Importing..."

### ✅ Ошибки отображаются
- MSW мокирует API с ошибками
- Проверяется отображение ошибок в UI
- Ошибки содержат номер строки и причину

### ✅ Summary корректен
- Все поля summary присутствуют
- Типы полей корректны (number)
- Значения соответствуют API ответу

---

## Особенности

- ✅ **React Testing Library** - для тестирования компонентов
- ✅ **MSW** - для мокирования API
- ✅ **Vitest** - test runner
- ✅ **Не тестирует стили** - только функциональность
- ✅ **Не хардкодит поля** - использует динамические колонки
- ✅ **User interactions** - через @testing-library/user-event

---

## Установка зависимостей

```bash
npm install --save-dev \
  @testing-library/jest-dom \
  @testing-library/react \
  @testing-library/user-event \
  @vitejs/plugin-react \
  msw \
  vitest \
  jsdom
```

---

## Запуск тестов

```bash
# Все тесты
npm test

# Только import-export тесты
npm test __tests__/import-export

# С coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Итого

- **Всего тестов**: 23
- **Покрытие**: Все основные сценарии страницы импорта/экспорта
- **Тип тестов**: Unit + Integration
- **Инструменты**: Vitest, React Testing Library, MSW

