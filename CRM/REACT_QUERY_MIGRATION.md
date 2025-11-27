# Миграция на React Query

## Установленные пакеты

- `@tanstack/react-query` - основная библиотека
- `@tanstack/react-query-devtools` - инструменты разработчика

## Созданные файлы

### 1. `src/lib/query-client.ts`
Настройка QueryClient с оптимизированным кэшированием:
- `staleTime`: 5 минут (данные считаются свежими)
- `gcTime`: 10 минут (время хранения неиспользуемых данных)
- `refetchOnWindowFocus`: true (автообновление при фокусе)
- `refetchOnReconnect`: true (автообновление при переподключении)
- `retry`: 1 (одна повторная попытка при ошибке)

### 2. Хуки для API запросов

#### `src/hooks/use-contacts.ts`
- `useContacts()` - получение списка контактов
- `useContact(id)` - получение одного контакта
- `useCompanies()` - получение списка компаний
- `useCreateContact()` - создание контакта
- `useUpdateContact()` - обновление контакта
- `useDeleteContact()` - удаление контакта

**Настройки кэширования:**
- Списки: `staleTime: 2 минуты`
- Детали: `staleTime: 5 минут`
- Компании: `staleTime: 10 минут`

#### `src/hooks/use-deals.ts`
- `useDeals()` - получение списка сделок
- `useDeal(id)` - получение одной сделки
- `useCreateDeal()` - создание сделки
- `useUpdateDeal()` - обновление сделки
- `useDeleteDeal()` - удаление сделки

**Настройки кэширования:**
- Списки: `staleTime: 1 минута` (сделки часто обновляются)
- Детали: `staleTime: 2 минуты`

#### `src/hooks/use-companies.ts`
- `useCompanies()` - получение списка компаний
- `useCompany(id)` - получение одной компании
- `useCreateCompany()` - создание компании
- `useUpdateCompany()` - обновление компании
- `useDeleteCompany()` - удаление компании

**Настройки кэширования:**
- Все запросы: `staleTime: 5 минут` (компании редко меняются)

#### `src/hooks/use-pipelines.ts`
- `usePipelines()` - получение списка пайплайнов
- `usePipeline(id)` - получение одного пайплайна
- `useCreatePipeline()` - создание пайплайна
- `useUpdatePipeline()` - обновление пайплайна
- `useDeletePipeline()` - удаление пайплайна

**Настройки кэширования:**
- Все запросы: `staleTime: 10 минут` (пайплайны редко меняются)

## Обновленные компоненты

### `src/App.tsx`
- Обернут в `QueryClientProvider`
- Добавлен `ReactQueryDevtools` для отладки

### `src/pages/ContactsPage.tsx`
**Изменения:**
- Удалены `useState` для `contacts`, `companies`, `loading`
- Удален `useEffect` с ручной загрузкой данных
- Используются хуки: `useContacts()`, `useCompanies()`, `useDeleteContact()`, `useCreateContact()`
- Автоматическая инвалидация кэша при мутациях

**Преимущества:**
- Автоматическое кэширование
- Меньше запросов к API
- Автоматическое обновление при изменении данных

### `src/pages/CompaniesPage.tsx`
**Изменения:**
- Удалены `useState` для `companies`, `loading`
- Удален `useEffect` с ручной загрузкой данных
- Используются хуки: `useCompanies()`, `useDeleteCompany()`
- Интеграция с WebSocket через инвалидацию кэша

**Преимущества:**
- Кэширование данных компаний
- Автоматическая синхронизация с WebSocket обновлениями

### `src/pages/DealsPage.tsx`
**Изменения:**
- Используется `usePipelines()` вместо ручной загрузки
- Используется `useCreatePipeline()` для создания пайплайнов
- Автоматическое обновление списка пайплайнов

## Query Keys структура

Все query keys организованы иерархически для эффективной инвалидации:

```typescript
// Пример для контактов
contactKeys = {
  all: ['contacts'],
  lists: () => ['contacts', 'list'],
  list: (filters) => ['contacts', 'list', filters],
  details: () => ['contacts', 'detail'],
  detail: (id) => ['contacts', 'detail', id],
  companies: () => ['contacts', 'companies'],
}
```

Это позволяет:
- Инвалидировать все запросы контактов: `invalidateQueries({ queryKey: contactKeys.all })`
- Инвалидировать только списки: `invalidateQueries({ queryKey: contactKeys.lists() })`
- Инвалидировать конкретный контакт: `invalidateQueries({ queryKey: contactKeys.detail(id) })`

## Преимущества миграции

1. **Уменьшение нагрузки на сеть:**
   - Данные кэшируются и переиспользуются
   - Автоматический рефетч только при необходимости

2. **Улучшение UX:**
   - Мгновенное отображение кэшированных данных
   - Фоновое обновление данных
   - Оптимистичные обновления (можно добавить)

3. **Упрощение кода:**
   - Меньше boilerplate кода
   - Автоматическая обработка состояний загрузки/ошибок
   - Централизованное управление кэшем

4. **Отладка:**
   - React Query Devtools для визуализации кэша
   - Логирование всех запросов

## Следующие шаги

1. Переписать остальные страницы (TasksPage, UsersPage, etc.)
2. Добавить оптимистичные обновления для лучшего UX
3. Настроить prefetching для предзагрузки данных
4. Добавить infinite queries для пагинации

