# Анализ ошибки "Cannot use 'import.meta' outside a module"

## 🔍 Проблема

**Ошибка:** `Uncaught SyntaxError: Cannot use 'import.meta' outside a module`

## 📋 Анализ проекта

### 1. Тип проекта

**Проект является ESM (ES Modules) с Vite:**

✅ `package.json` содержит `"type": "module"`  
✅ Используется **Vite 6.0.5** как сборщик  
✅ `index.html` правильно подключает скрипт: `<script type="module" src="/src/main.tsx"></script>`  
✅ `tsconfig.json` настроен: `"module": "ESNext"`, `"moduleResolution": "bundler"`

### 2. Где используется `import.meta`

Найдено **18 использований** `import.meta.env` в следующих файлах:

**API файлы (10 файлов):**
- `lib/api/deals.ts` - строка 1
- `lib/api/pipelines.ts` - строка 1
- `lib/api/tasks.ts` - строка 1
- `lib/api/stats.ts` - строка 1
- `lib/api/users.ts` - строка 1
- `lib/api/activities.ts` - строка 1
- `lib/api/emails.ts` - строка 1
- `lib/api/auth.ts` - строки 1 и 62
- `lib/api/contacts.ts` - строка 6
- `lib/api/companies.ts` - строка 1

**Hooks (4 файла):**
- `hooks/use-deal.ts` - строки 93 и 215
- `hooks/use-realtime-contact.ts` - строка 25
- `hooks/use-realtime-company.ts` - строка 29
- `hooks/use-realtime-deal.ts` - строка 27 (закомментировано)

**Components (1 файл):**
- `components/crm/deals-kanban-board.tsx` - строка 734

### 3. Причина ошибки

**Проблема:** Все файлы API используют `import.meta.env` на **верхнем уровне модуля** (top-level), что правильно для ESM. Однако ошибка возникает, если:

1. **Файлы импортируются до инициализации Vite**
   - Vite должен обработать `import.meta.env` и заменить его на реальные значения
   - Если файл импортируется вне контекста Vite, `import.meta` недоступен

2. **Проблема с конфигурацией Vite**
   - Vite может не обрабатывать некоторые файлы правильно
   - Может быть проблема с путями или alias

3. **Импорт в неправильном контексте**
   - Файлы могут импортироваться в SSR контексте
   - Или в контексте, где модули не поддерживаются

## 🔧 Решение

### Вариант 1: Использовать функцию-геттер (Рекомендуется)

Вместо константы на верхнем уровне, использовать функцию:

```typescript
// БЫЛО:
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
}

// СТАЛО:
function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
  }
  return url
}

// Использование:
const response = await fetch(`${getApiBaseUrl()}/deals`, { ... })
```

**Проблема:** Это требует изменения во всех местах использования.

### Вариант 2: Использовать ленивую инициализацию (Лучшее решение)

Создать модуль-конфигурацию с ленивой инициализацией:

```typescript
// lib/config.ts
let _apiBaseUrl: string | null = null

export function getApiBaseUrl(): string {
  if (_apiBaseUrl === null) {
    _apiBaseUrl = import.meta.env.VITE_API_URL
    if (!_apiBaseUrl) {
      throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
    }
  }
  return _apiBaseUrl
}

export function getWsUrl(): string {
  const url = import.meta.env.VITE_WS_URL
  if (!url) {
    throw new Error('VITE_WS_URL environment variable is not set. Please configure it in .env.local')
  }
  return url
}
```

Затем в API файлах:
```typescript
// lib/api/deals.ts
import { getApiBaseUrl } from '@/lib/config'

export async function getDeals(...) {
  const API_BASE_URL = getApiBaseUrl()
  // ...
}
```

### Вариант 3: Проверка доступности import.meta (Быстрое решение)

Добавить проверку перед использованием:

```typescript
// lib/api/deals.ts
const API_BASE_URL = (() => {
  if (typeof import.meta === 'undefined') {
    throw new Error('import.meta is not available. This code must run in a module context.')
  }
  const url = import.meta.env.VITE_API_URL
  if (!url) {
    throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
  }
  return url
})()
```

### Вариант 4: Исправить конфигурацию Vite (Если проблема в конфиге)

Проверить `vite.config.ts` и убедиться, что все файлы обрабатываются:

```typescript
// vite.config.ts
export default defineConfig({
  // ...
  optimizeDeps: {
    include: [
      // Убедиться что все API файлы включены
      'lib/api/**',
    ],
  },
  // ...
})
```

## 🎯 Рекомендуемое решение

**Использовать Вариант 2** - создать централизованный модуль конфигурации:

1. Создать `lib/config.ts` с функциями-геттерами
2. Обновить все API файлы для использования этих функций
3. Это решит проблему и сделает код более поддерживаемым

## 📝 Конкретные изменения

### Шаг 1: Создать lib/config.ts

```typescript
// lib/config.ts
let _apiBaseUrl: string | null = null
let _wsUrl: string | null = null

export function getApiBaseUrl(): string {
  if (_apiBaseUrl === null) {
    if (typeof import.meta === 'undefined') {
      throw new Error('import.meta is not available. This code must run in a Vite module context.')
    }
    _apiBaseUrl = import.meta.env.VITE_API_URL
    if (!_apiBaseUrl) {
      throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
    }
  }
  return _apiBaseUrl
}

export function getWsUrl(): string {
  if (_wsUrl === null) {
    if (typeof import.meta === 'undefined') {
      throw new Error('import.meta is not available. This code must run in a Vite module context.')
    }
    _wsUrl = import.meta.env.VITE_WS_URL
    if (!_wsUrl) {
      throw new Error('VITE_WS_URL environment variable is not set. Please configure it in .env.local')
    }
  }
  return _wsUrl
}
```

### Шаг 2: Обновить API файлы

Пример для `lib/api/deals.ts`:

```typescript
// БЫЛО:
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
}

// СТАЛО:
import { getApiBaseUrl } from '@/lib/config'

// В функциях:
export async function getDeals(...) {
  const API_BASE_URL = getApiBaseUrl()
  // ...
}
```

## ✅ Проверка

После исправления:

1. Перезапустить dev server: `npm run dev`
2. Проверить консоль браузера - ошибка должна исчезнуть
3. Проверить что API запросы работают






