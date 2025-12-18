#!/bin/bash

# Скрипт для тестирования импорта контактов
# Требует: node, npm пакеты (form-data, node-fetch)

echo "🧪 Тестирование импорта контактов"
echo ""

# Проверка наличия файла
if [ ! -f "test-contacts.csv" ]; then
    echo "❌ Файл test-contacts.csv не найден"
    exit 1
fi

# Проверка наличия токена
if [ -z "$AUTH_TOKEN" ]; then
    echo "⚠️  AUTH_TOKEN не установлен"
    echo "   Получите токен после авторизации в приложении"
    echo "   export AUTH_TOKEN='your-jwt-token'"
    exit 1
fi

# Установка зависимостей если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install form-data node-fetch@2
fi

# Запуск теста
echo "🚀 Запуск теста импорта контактов (dry-run)..."
node test-import.js contact test-contacts.csv true

echo ""
echo "✅ Тест завершен"
echo ""
echo "Для реального импорта запустите:"
echo "  node test-import.js contact test-contacts.csv false"

