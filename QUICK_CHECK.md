# 🚀 Быстрая проверка логов и состояния

## ⚡ Команды для быстрой проверки

### 1. Проверить, что backend работает
```bash
curl http://localhost:3001/api/health
```
Должен вернуть: `{"status":"ok",...}`

### 2. Посмотреть последние логи
```bash
tail -50 /tmp/backend_runtime.log
```

### 3. Мониторинг в реальном времени (во время dry-run)
```bash
tail -f /tmp/backend_runtime.log | grep --line-buffered -E '🔥|import|deals|error' -i
```

### 4. Запустить скрипт проверки
```bash
./check-backend-logs.sh
```

## 🌐 Проверка в браузере

1. Откройте DevTools (`F12`)
2. Вкладка **Network**
3. Фильтр: **XHR** или **Fetch**
4. Выполните dry-run импорта
5. Найдите запрос: `POST /api/import/deals?dryRun=true`

### Проверьте:
- **URL**: `/api/import/deals?dryRun=true` ✅
- **Method**: `POST` ✅
- **Status**: `200 OK` ✅
- **Content-Type** (Request Headers): `application/json` ✅
- **Request Payload**: должен содержать `rows`, `mapping`, `pipelineId` (НЕ `file`) ✅

## 🔍 Что искать в логах при dry-run

### ✅ Успешный запрос:
```
🔥 CONTROLLER ENTRY - importDeals endpoint called
🔥 DTO received: { hasRows: true, rowsCount: 5, ... }
🔥 IMPORT ENTRY - importDeals called
```

### ❌ Проблема с роутингом:
```
🔥 CONTROLLER ENTRY - importContacts endpoint called (NOT deals!)
```

### ❌ Проблема с данными:
```
🔥 DTO received: { hasRows: false, rowsCount: 0, ... }
```

## 📝 Полезные команды

### Очистить логи и начать заново
```bash
> /tmp/backend_runtime.log
```

### Найти все ошибки
```bash
grep -i "error\|exception\|failed" /tmp/backend_runtime.log | tail -20
```

### Найти все запросы к импорту
```bash
grep "importDeals\|importContacts" /tmp/backend_runtime.log | tail -20
```



