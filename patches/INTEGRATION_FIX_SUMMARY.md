# Полное восстановление связки фронта и бэка в GitHub Codespaces

## ✅ Выполненные действия

### 1. Определен Codespace URL
- **URL:** `https://obscure-spoon-966r594rg4hxj66-3001.app.github.dev`
- **Формат:** `https://<codespace-name>-3001.app.github.dev`

### 2. Создан файл `.env.local`
- **Путь:** `CRM/.env.local`
- **Содержимое:**
  ```env
  VITE_API_URL="https://obscure-spoon-966r594rg4hxj66-3001.app.github.dev/api"
  VITE_WS_URL="https://obscure-spoon-966r594rg4hxj66-3001.app.github.dev/realtime"
  ```

## 🔍 Найденные проблемы

### Проблема 1: Hardcoded localhost fallbacks в API файлах
**Файлы:**
- `CRM/lib/api/deals.ts`
- `CRM/lib/api/pipelines.ts`
- `CRM/lib/api/tasks.ts`
- `CRM/lib/api/stats.ts`
- `CRM/lib/api/users.ts`
- `CRM/lib/api/activities.ts`
- `CRM/lib/api/emails.ts`
- `CRM/lib/api/auth.ts`
- `CRM/lib/api/contacts.ts`
- `CRM/lib/api/companies.ts`
- `CRM/hooks/use-deal.ts`

**Проблема:** Все файлы используют fallback на `http://localhost:3001/api`, что не работает в Codespaces.

**Решение:** Убрать fallback и требовать наличие `VITE_API_URL` в env переменных.

### Проблема 2: Hardcoded localhost в WebSocket подключениях
**Файлы:**
- `CRM/components/crm/deals-kanban-board.tsx`
- `CRM/hooks/use-realtime-contact.ts`
- `CRM/hooks/use-realtime-company.ts`
- `CRM/hooks/use-realtime-deal.ts`

**Проблема:** WebSocket использует fallback на `http://localhost:3001/realtime`.

**Решение:** Убрать fallback и требовать наличие `VITE_WS_URL`.

### Проблема 3: Hardcoded localhost в сообщении об ошибке
**Файл:** `CRM/lib/api/auth.ts:62`

**Проблема:** Сообщение об ошибке содержит hardcoded `http://localhost:3001`.

**Решение:** Использовать динамический URL из env переменной.

### Проблема 4: Закомментированный код с localhost:3000
**Файл:** `CRM/hooks/use-realtime-deal.ts:26`

**Проблема:** Закомментированный код содержит `ws://localhost:3000`.

**Решение:** Обновить комментарий для использования Socket.IO и env переменных.

## ✅ Проверка маршрутов

Все маршруты соответствуют `backend_routes.md`:
- ✅ `/api/auth/*` - используется
- ✅ `/api/users/*` - используется
- ✅ `/api/pipelines/*` - используется
- ✅ `/api/deals/*` - используется
- ✅ `/api/contacts/*` - используется
- ✅ `/api/companies/*` - используется
- ✅ `/api/tasks/*` - используется
- ✅ `/api/stats/*` - используется
- ✅ `/api/activities/*` - используется
- ✅ `/api/emails/*` - используется
- ✅ `/realtime` (WebSocket) - используется

**Legacy paths не найдены:** `/api/v1`, `/api/v2`, `/v1/`, `/v2/` - отсутствуют.

## 📝 Патч файлы

Созданы патч файлы в директории `patches/`:
1. `01-fix-api-base-urls.patch` - исправление API URLs
2. `02-fix-websocket-urls.patch` - исправление WebSocket URLs

## 🚀 Шаги для применения патчей

### Шаг 1: Применить исправления API URLs

Для каждого файла из списка выше заменить:

```typescript
// БЫЛО:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// СТАЛО:
const API_BASE_URL = import.meta.env.VITE_API_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
}
```

### Шаг 2: Исправить auth.ts

```typescript
// БЫЛО:
if (error instanceof TypeError && error.message === 'Failed to fetch') {
  throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3001')
}

// СТАЛО:
if (error instanceof TypeError && error.message === 'Failed to fetch') {
  const apiUrl = import.meta.env.VITE_API_URL || 'backend server'
  throw new Error(`Cannot connect to server at ${apiUrl}. Please check your VITE_API_URL configuration and ensure the backend is running.`)
}
```

### Шаг 3: Исправить WebSocket подключения

```typescript
// БЫЛО:
const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime', {
  auth: { token },
  transports: ['websocket', 'polling'],
})

// СТАЛО:
const wsUrl = import.meta.env.VITE_WS_URL
if (!wsUrl) {
  console.error('VITE_WS_URL environment variable is not set. WebSocket connections will not work.')
  return
}

const socket = io(wsUrl, {
  auth: { token },
  transports: ['websocket', 'polling'],
})
```

## 🧪 Шаги для проверки

### 1. Убедиться что .env.local создан
```bash
cat CRM/.env.local
```

### 2. Перезапустить frontend dev server
```bash
cd CRM
npm run dev
```

### 3. Проверить что env переменные загружены
В консоли браузера (DevTools):
```javascript
console.log(import.meta.env.VITE_API_URL)
console.log(import.meta.env.VITE_WS_URL)
```

### 4. Запустить smoke test
```bash
cd /workspaces/voyz-crm
python3 reports/smoke_test.py
```

### 5. Проверить в браузере
1. Открыть приложение в Codespace preview
2. Проверить Network tab в DevTools
3. Убедиться что все запросы идут на Codespace URL, а не localhost
4. Проверить WebSocket подключение в Network tab

## ⚠️ Важные замечания

1. **Коды Codespace могут меняться** - если Codespace пересоздается, нужно обновить `.env.local` с новым URL
2. **Для локальной разработки** - создать `.env.local` с `http://localhost:3001/api` и `http://localhost:3001/realtime`
3. **Git ignore** - `.env.local` уже в `.gitignore`, не коммитить его в репозиторий

