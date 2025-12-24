#!/bin/bash
echo "🔪 Killing ALL processes..."
pkill -9 -f "nest start" 2>/dev/null
pkill -9 -f "node.*nest" 2>/dev/null
pkill -9 -f "ts-node" 2>/dev/null
pkill -9 -f "tsc.*watch" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

echo "🧹 Clearing cache..."
cd /workspaces/voyz-crm/voyz-crm/crm-backend
rm -rf dist node_modules/.cache .nest 2>/dev/null

echo "✅ Starting server in FOREGROUND (you will see logs here)..."
npm run start:dev

