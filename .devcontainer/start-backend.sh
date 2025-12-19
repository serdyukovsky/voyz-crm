#!/bin/bash
# Don't use set -e to avoid failing on non-critical errors

echo "🚀 Starting backend server..."

# Navigate to backend directory
cd /workspaces/voyz-crm/crm-backend || {
  echo "❌ Failed to navigate to crm-backend directory"
  exit 1
}

# Check if backend is already running
if pgrep -f "nest start" > /dev/null || pgrep -f "node.*main" > /dev/null; then
  echo "✅ Backend is already running"
  exit 0
fi

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
POSTGRES_READY=0
for i in {1..30}; do
  if pg_isready -h localhost > /dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
    POSTGRES_READY=1
    break
  fi
  sleep 1
done

if [ $POSTGRES_READY -eq 0 ]; then
  echo "⚠️  PostgreSQL not ready after 30 seconds, continuing anyway..."
fi

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "📥 Installing dependencies..."
  npm install || {
    echo "⚠️  npm install failed, but continuing..."
  }
fi

# Generate Prisma Client if needed
if [ ! -f "node_modules/.prisma/client/index.js" ]; then
  echo "🔨 Generating Prisma Client..."
  npx prisma generate || {
    echo "⚠️  Prisma generate failed, but continuing..."
  }
fi

# Start backend in background
echo "▶️  Starting NestJS backend on port 3001..."
cd /workspaces/voyz-crm/crm-backend

# Start backend and redirect output to log file
nohup npm run start:dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 8

# Check if backend started successfully
if pgrep -f "nest start" > /dev/null || pgrep -f "node.*main" > /dev/null; then
  echo "✅ Backend started successfully!"
  echo "📡 Backend API: http://localhost:3001"
  echo "📚 Swagger docs: http://localhost:3001/api/docs"
  echo "📋 Logs: tail -f /tmp/backend.log"
  echo "🔄 Process ID: $BACKEND_PID"
else
  echo "⚠️  Backend may not have started. Check logs:"
  echo "   tail -f /tmp/backend.log"
  echo "   Or try manually: cd crm-backend && npm run start:dev"
fi

