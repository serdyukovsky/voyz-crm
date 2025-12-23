# 🔍 Как проверить логи backend и диагностировать проблемы

## 📋 Быстрая проверка

### 1. Запустить скрипт проверки
```bash
./check-backend-logs.sh
```

### 2. Просмотр логов в реальном времени
```bash
# Все логи backend
tail -f /tmp/backend.log

# Только диагностические логи (с маркером 🔥)
tail -f /tmp/backend.log | grep --line-buffered "🔥"

# Только ошибки
tail -f /tmp/backend.log | grep --line-buffered -i "error\|exception"
```

## 🔧 Проверка через терминал

### Проверка процессов
```bash
ps aux | grep -E "nest.*start|node.*dist/main" | grep -v grep
```

### Проверка доступности
```bash
curl http://localhost:3001/api/health
```

### Последние логи
```bash
tail -50 /tmp/backend.log
```

### Поиск конкретных логов
```bash
# Логи импорта
grep "importDeals\|importContacts" /tmp/backend.log | tail -20

# Диагностические логи
grep "🔥" /tmp/backend.log | tail -20

# Ошибки
grep -i "error\|exception" /tmp/backend.log | tail -20
```

## 🌐 Проверка через браузер (Network Tab)

### 1. Откройте DevTools
- `F12` или `Ctrl+Shift+I` (Windows/Linux)
- `Cmd+Option+I` (Mac)

### 2. Перейдите на вкладку Network
- Фильтр: `XHR` или `Fetch`

### 3. Выполните dry-run импорта
- Загрузите CSV файл
- Нажмите "Run Dry Run"

### 4. Проверьте запрос `POST /api/import/deals?dryRun=true`

#### Headers (заголовки):
- ✅ `Content-Type: application/json`
- ✅ `Authorization: Bearer ...`

#### Payload (тело запроса):
Должно содержать:
```json
{
  "rows": [...],
  "mapping": {...},
  "pipelineId": "...",
  "workspaceId": "..."
}
```

❌ НЕ должно содержать:
- `file`
- `delimiter`

#### Response (ответ):
- Status: `200 OK` (даже при ошибках в dry-run)
- Body: JSON с `summary`, `errors`, `globalErrors`

## 🐛 Диагностика проблем

### Проблема: "CSV file is required"

**Проверьте:**
1. В логах backend должно быть:
   ```
   🔥 CONTROLLER ENTRY - importDeals endpoint called
   ```
   Если видите `importContacts` вместо `importDeals` → проблема в роутинге

2. В Network tab:
   - URL должен быть `/api/import/deals`
   - Content-Type должен быть `application/json`
   - Body не должен содержать `file`

### Проблема: Backend не отвечает

**Проверьте:**
```bash
# Процесс запущен?
ps aux | grep "node.*dist/main"

# Порт занят?
netstat -tuln | grep 3001

# Логи ошибок
tail -100 /tmp/backend.log | grep -i error
```

### Проблема: Нет логов

**Проверьте:**
```bash
# Где пишутся логи?
ls -lh /tmp/backend*.log

# Альтернативные места логов
ls -lh /workspaces/voyz-crm/voyz-crm/crm-backend/*.log 2>/dev/null
```

## 📝 Полезные команды

### Перезапуск backend с логами
```bash
cd /workspaces/voyz-crm/voyz-crm/crm-backend
pkill -f "nest start" || pkill -f "node.*dist/main"
npm run start:dev > /tmp/backend.log 2>&1 &
```

### Очистка логов
```bash
> /tmp/backend.log
```

### Мониторинг в реальном времени
```bash
# Все логи
tail -f /tmp/backend.log

# Только импорт
tail -f /tmp/backend.log | grep --line-buffered "import\|🔥"

# Только ошибки
tail -f /tmp/backend.log | grep --line-buffered -i "error\|exception\|failed"
```

## 🎯 Что искать в логах при dry-run

### Успешный запрос:
```
🔥 CONTROLLER ENTRY - importDeals endpoint called
🔥 DTO received: { hasRows: true, rowsCount: 5, ... }
🔥 IMPORT ENTRY - importDeals called
[IMPORT PIPELINE DEBUG] { pipelineId: '...', pipelineLoaded: true, ... }
```

### Проблема с роутингом:
```
🔥 CONTROLLER ENTRY - importContacts endpoint called (NOT deals!)
```

### Проблема с валидацией:
```
🔥 DTO received: { hasRows: false, rowsCount: 0, ... }
```

### Проблема с pipeline:
```
[IMPORT PIPELINE DEBUG] { pipelineId: null, pipelineLoaded: false, ... }
```




