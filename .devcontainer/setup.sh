#!/bin/bash
set -e

echo "🚀 Setting up CRM Development Environment..."

# Update package list and install sudo (node image doesn't have it)
apt-get update -qq
apt-get install -y sudo

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
apt-get install -y \
  postgresql \
  postgresql-contrib \
  postgresql-client \
  libpq-dev \
  build-essential \
  openssl \
  curl \
  git

# Initialize and start PostgreSQL
echo "▶️  Starting PostgreSQL..."
service postgresql start
sleep 3

# Create database and user
echo "🗄️  Setting up database..."
su - postgres -c "psql -c \"CREATE USER node WITH SUPERUSER PASSWORD 'postgres';\"" 2>/dev/null || echo "User already exists"
su - postgres -c "psql -c \"CREATE DATABASE crm_db OWNER node;\"" 2>/dev/null || echo "Database already exists"

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
if pg_isready -h localhost -U node -d crm_db > /dev/null 2>&1; then
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
echo "   2. Start backend: cd crm-backend && npm run start:dev"
echo "   3. Start frontend: cd CRM && npm run dev"
echo "   4. API docs: http://localhost:3001/api/docs"
echo "   5. Frontend: http://localhost:3000"
