# Изменения по файлам - React Query интеграция

## 📦 Установленные пакеты

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools --legacy-peer-deps
```

## 📁 Новые файлы

### 1. `src/lib/query-client.ts`
Создан QueryClient с настройками кэширования:
- `staleTime`: 5 минут
- `gcTime`: 10 минут  
- `refetchOnWindowFocus`: true
- `refetchOnReconnect`: true
- `retry`: 1

### 2. `src/hooks/use-contacts.ts`
Хуки для работы с контактами:
- `useContacts(params)` - список контактов (staleTime: 2 мин)
- `useContact(id)` - один контакт (staleTime: 5 мин)
- `useCompanies()` - список компаний (staleTime: 10 мин)
- `useCreateContact()` - создание
- `useUpdateContact()` - обновление
- `useDeleteContact()` - удаление

### 3. `src/hooks/use-deals.ts`
Хуки для работы со сделками:
- `useDeals(params)` - список сделок (staleTime: 1 мин)
- `useDeal(id)` - одна сделка (staleTime: 2 мин)
- `useCreateDeal()` - создание
- `useUpdateDeal()` - обновление
- `useDeleteDeal()` - удаление

### 4. `src/hooks/use-companies.ts`
Хуки для работы с компаниями:
- `useCompanies(params)` - список (staleTime: 5 мин)
- `useCompany(id)` - одна компания (staleTime: 5 мин)
- `useCreateCompany()` - создание
- `useUpdateCompany()` - обновление
- `useDeleteCompany()` - удаление

### 5. `src/hooks/use-pipelines.ts`
Хуки для работы с пайплайнами:
- `usePipelines()` - список (staleTime: 10 мин)
- `usePipeline(id)` - один пайплайн (staleTime: 10 мин)
- `useCreatePipeline()` - создание
- `useUpdatePipeline()` - обновление
- `useDeletePipeline()` - удаление

## 🔄 Измененные файлы

### `src/App.tsx`
**Добавлено:**
```typescript
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/query-client'

// Обернуто приложение в QueryClientProvider
<QueryClientProvider client={queryClient}>
  {/* ... */}
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### `src/pages/ContactsPage.tsx`
**Удалено:**
- `useState` для `contacts`, `companies`, `loading`
- `useEffect` с ручной загрузкой данных
- Функция `loadData()`

**Добавлено:**
```typescript
import { useContacts, useCompanies, useDeleteContact, useCreateContact } from '@/hooks/use-contacts'

const { data: contactsData = [], isLoading: contactsLoading } = useContacts({...})
const { data: companies = [], isLoading: companiesLoading } = useCompanies()
const deleteContactMutation = useDeleteContact()
const createContactMutation = useCreateContact()
```

**Преимущества:**
- Автоматическое кэширование
- Автоматическая инвалидация при мутациях
- Меньше кода

### `src/pages/CompaniesPage.tsx`
**Удалено:**
- `useState` для `companies`, `loading`
- `useEffect` с ручной загрузкой
- Функция `loadCompanies()`

**Добавлено:**
```typescript
import { useCompanies, useDeleteCompany } from '@/hooks/use-companies'
import { useQueryClient } from '@tanstack/react-query'

const { data: companiesData = [], isLoading } = useCompanies({...})
const deleteCompanyMutation = useDeleteCompany()
```

**Изменено:**
- WebSocket обновления теперь инвалидируют кэш через `queryClient.invalidateQueries()`

### `src/pages/DealsPage.tsx`
**Удалено:**
- `useState` для `funnels`, `pipelinesLoading`
- `useEffect` с ручной загрузкой пайплайнов
- Функция `loadPipelines()`

**Добавлено:**
```typescript
import { usePipelines, useCreatePipeline } from '@/hooks/use-pipelines'
import { useCreateDeal } from '@/hooks/use-deals'

const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines()
const createPipelineMutation = useCreatePipeline()
const createDealMutation = useCreateDeal()
```

**Изменено:**
- `handleAddFunnel` теперь использует `createPipelineMutation`
- Автоматическое обновление списка пайплайнов

## 🎯 Настройки кэширования

| Тип данных | staleTime | Причина |
|------------|-----------|---------|
| Списки сделок | 1 минута | Часто обновляются |
| Списки контактов | 2 минуты | Средняя частота обновлений |
| Детали сделок | 2 минуты | Средняя частота обновлений |
| Детали контактов | 5 минут | Редко меняются |
| Компании | 5 минут | Редко меняются |
| Пайплайны | 10 минут | Очень редко меняются |

## 🔑 Query Keys структура

Все query keys организованы иерархически:

```typescript
// Пример для контактов
contactKeys = {
  all: ['contacts'],
  lists: () => ['contacts', 'list'],
  list: (filters) => ['contacts', 'list', filters],
  details: () => ['contacts', 'detail'],
  detail: (id) => ['contacts', 'detail', id],
}
```

Это позволяет эффективно инвалидировать кэш:
- Все контакты: `invalidateQueries({ queryKey: contactKeys.all })`
- Только списки: `invalidateQueries({ queryKey: contactKeys.lists() })`
- Конкретный контакт: `invalidateQueries({ queryKey: contactKeys.detail(id) })`

## ✅ Преимущества

1. **Уменьшение нагрузки на сеть** - данные кэшируются и переиспользуются
2. **Улучшение UX** - мгновенное отображение кэшированных данных
3. **Упрощение кода** - меньше boilerplate, автоматическая обработка состояний
4. **Отладка** - React Query Devtools для визуализации кэша

## 📝 Следующие шаги

1. Переписать остальные страницы (TasksPage, UsersPage, etc.)
2. Добавить оптимистичные обновления
3. Настроить prefetching для предзагрузки
4. Добавить infinite queries для пагинации
