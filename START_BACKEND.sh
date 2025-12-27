#!/bin/bash
# Скрипт для запуска бэкенда

cd /workspaces/voyz-crm/voyz-crm/crm-backend

echo "🛑 Останавливаем старые процессы..."
pkill -f "nest start" 2>/dev/null
pkill -f "node.*nest" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

echo "🚀 Запускаем бэкенд..."
npm run start:dev > /tmp/backend-full.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > /tmp/backend.pid

echo "✅ Бэкенд запущен (PID: $BACKEND_PID)"
echo ""
echo "📋 Логи можно смотреть командой:"
echo "   tail -f /tmp/backend-full.log"
echo ""
echo "⏳ Ждем 5 секунд..."
sleep 5

echo ""
echo "🔍 Проверяем статус..."
curl -s http://localhost:3001/api/health && echo "" || echo "❌ Бэкенд еще запускается..."


