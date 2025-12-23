#!/bin/bash
# Скрипт для проверки логов backend

echo "=========================================="
echo "🔍 ПРОВЕРКА BACKEND ЛОГОВ"
echo "=========================================="
echo ""

echo "1️⃣ Проверка процессов backend:"
ps aux | grep -E "nest.*start|node.*dist/main" | grep -v grep || echo "   ❌ Backend не запущен"
echo ""

echo "2️⃣ Проверка доступности backend:"
curl -s http://localhost:3001/api/health 2>&1 | head -3 || echo "   ❌ Backend не отвечает"
echo ""

echo "3️⃣ Последние 30 строк логов (общие):"
tail -30 /tmp/backend.log 2>&1 | tail -20
echo ""

echo "4️⃣ Диагностические логи (🔥 маркеры):"
tail -200 /tmp/backend.log 2>&1 | grep -E "🔥|CONTROLLER ENTRY|IMPORT ENTRY|CSV file|ERROR" | tail -30
echo ""

echo "5️⃣ Ошибки в логах:"
tail -200 /tmp/backend.log 2>&1 | grep -i "error\|exception\|failed" | tail -20
echo ""

echo "6️⃣ Логи в реальном времени (нажмите Ctrl+C для выхода):"
echo "   Используйте: tail -f /tmp/backend.log"
echo ""

echo "=========================================="
echo "✅ Проверка завершена"
echo "=========================================="

