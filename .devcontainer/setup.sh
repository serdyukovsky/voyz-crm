#!/bin/bash
set -e

echo "🚀 Setting up CRM Development Environment..."

# Update package list
sudo apt-get update -qq

# Install additional dependencies
sudo apt-get install -y \
  postgresql-client \
  build-essential \
  libssl-dev \
  curl \
  git

# Setup PostgreSQL (if not already running)
if ! pg_isready -h localhost -U vscode > /dev/null 2>&1; then
  echo "📦 Setting up PostgreSQL..."
  sudo service postgresql start || true
  sleep 2
fi

# Create database and user (if not exists)
sudo -u postgres psql -c "CREATE USER vscode WITH SUPERUSER PASSWORD 'postgres';" 2>/dev/null || echo "User vscode already exists"
sudo -u postgres psql -c "CREATE DATABASE crm_db OWNER vscode;" 2>/dev/null || echo "Database crm_db already exists"

# Setup Backend
echo "📦 Setting up backend..."
cd /workspaces/voyz-crm/crm-backend

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  cat > .env << 'EOF'
DATABASE_URL="postgresql://vscode:postgres@localhost:5432/crm_db?schema=public"
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

# Run migrations (if database is ready)
if pg_isready -h localhost -U vscode > /dev/null 2>&1; then
  echo "🔄 Running database migrations..."
  npx prisma migrate deploy || npx prisma migrate dev --name init || true
fi

# Setup Frontend
echo "📦 Setting up frontend..."
cd /workspaces/voyz-crm/CRM

# Install frontend dependencies
if [ ! -d node_modules ]; then
  echo "📥 Installing frontend dependencies..."
  npm install --legacy-peer-deps
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Create admin user: cd crm-backend && npm run create:admin"
echo "   2. Start backend: cd crm-backend && npm run dev"
echo "   3. Start frontend: cd CRM && npm run dev"
echo "   4. API docs: http://localhost:3001/api/docs"
echo "   5. Frontend: http://localhost:3000"


