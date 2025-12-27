#!/bin/bash

LOG_FILE="/tmp/backend-run.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "❌ Лог файл не найден: $LOG_FILE"
  echo "Попробуйте: /tmp/backend-full.log"
  LOG_FILE="/tmp/backend-full.log"
  if [ ! -f "$LOG_FILE" ]; then
    echo "❌ Лог файл не найден: $LOG_FILE"
    exit 1
  fi
fi

echo "=========================================="
echo "🔍 ПРОВЕРКА ЛОГОВ ИМПОРТА"
echo "=========================================="
echo ""

echo "=== 1. Маппинг (последний запрос) ==="
grep -A 30 "IMPORT REQUEST\|🔥 IMPORT REQUEST" "$LOG_FILE" 2>/dev/null | tail -40 | head -40
echo ""

echo "=== 2. Извлечение данных из CSV (последняя строка) ==="
grep "MAP DEAL ROW RESULT" "$LOG_FILE" 2>/dev/null | tail -1
echo ""

echo "=== 3. Передача данных в dealsWithNumber (последняя строка) ==="
grep "IMPORT DEAL DATA" "$LOG_FILE" 2>/dev/null | tail -1
echo ""

echo "=== 4. Данные перед сохранением в БД (последняя строка) ==="
grep "BATCH CREATE DEAL DATA" "$LOG_FILE" 2>/dev/null | tail -1
echo ""

echo "=== 5. Ошибки импорта ==="
grep -i "error\|failed\|exception" "$LOG_FILE" 2>/dev/null | tail -10
echo ""

echo "=========================================="
echo "✅ Проверка завершена"
echo "=========================================="



