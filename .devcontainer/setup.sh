#!/bin/bash
set -e

echo "🚀 Setting up CRM Development Environment..."

# Persist GitHub auth/credentials across rebuilds
git config --global credential.helper "store --file /workspaces/voyz-crm/.git-credentials"
mkdir -p /workspaces/voyz-crm/.gh

# PostgreSQL is started by the container entrypoint; just verify readiness here.
echo "▶️  Checking PostgreSQL..."
if pg_isready -h localhost > /dev/null 2>&1; then
  echo "✅ PostgreSQL is already running"
else
  echo "⚠️  PostgreSQL is not ready yet. It should come up shortly."
fi

# Setup Backend
echo "📦 Setting up backend..."
cd /workspaces/voyz-crm/crm-backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << 'EOF'
DATABASE_URL="postgresql://node:postgres@localhost:5432/crm_db?schema=public"
NODE_ENV=development
PORT=3001
JWT_ACCESS_SECRET=super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL="http://localhost:3000"
EOF
  echo "✅ Created .env file"
fi

# Install backend dependencies
if [ ! -d node_modules ]; then
  echo "📥 Installing backend dependencies..."
  npm install
fi

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate || true

# Run migrations
if pg_isready -h localhost > /dev/null 2>&1; then
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy || npx prisma migrate dev --name init || true
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Create admin user: cd crm-backend && npm run create:admin"
echo "   2. Start backend: cd crm-backend && npm run start:dev"
echo "   3. API docs: http://localhost:3001/api/docs"
