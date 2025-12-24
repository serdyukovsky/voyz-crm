#!/bin/bash
# Kill all existing processes
echo "🔪 Killing all existing processes..."
pkill -9 -f "nest start" 2>/dev/null
pkill -9 -f "node.*nest" 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 2

# Clear any cached builds
echo "🧹 Clearing build cache..."
rm -rf dist 2>/dev/null

# Start server in foreground
echo "🚀 Starting server..."
cd /workspaces/voyz-crm/voyz-crm/crm-backend
npm run start:dev


