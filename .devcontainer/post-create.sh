#!/bin/bash
set -e

echo "🚀 Setting up CRM Backend development environment..."

# Update package list
echo "📦 Updating package list..."
sudo apt update

# Install PostgreSQL and client
echo "🐘 Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-client

# Start PostgreSQL service
echo "▶️  Starting PostgreSQL..."
sudo service postgresql start

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
for i in {1..10}; do
    if sudo -u postgres pg_isready -q; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    echo "   Attempt $i/10..."
    sleep 1
done

# Create database and user (if they don't exist)
echo "🗄️  Setting up database..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE crm_db;" 2>/dev/null || echo "Database crm_db already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE crm_db TO postgres;" 2>/dev/null || true

# Navigate to backend directory
cd /workspaces/voyz-crm/crm-backend || exit

# Install npm dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm dependencies..."
    npm install
else
    echo "✅ node_modules already exists, skipping npm install"
fi

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate || echo "⚠️  Prisma generate failed, but continuing..."

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy || echo "⚠️  Migrations failed, but continuing..."

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Run: cd crm-backend && npm run dev"
echo "   2. API will be available at: http://localhost:3001"
echo "   3. Swagger docs: http://localhost:3001/api/docs"
echo "   4. Create admin user: npm run create:admin"

