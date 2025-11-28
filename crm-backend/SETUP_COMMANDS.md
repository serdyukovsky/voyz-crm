# Setup Commands

## Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Create database and run migrations
npm run prisma:migrate dev --name init

# 5. Seed database (creates admin user)
npm run prisma:seed

# 6. Start development server
npm run start:dev
```

## Development Commands

```bash
# Start development server with hot reload
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Generate test coverage
npm run test:cov
```

## Database Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create new migration
npm run prisma:migrate dev --name migration_name

# Apply migrations
npm run prisma:migrate deploy

# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Seed database
npm run prisma:seed

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Environment Variables

Required environment variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/crm"

# JWT
JWT_ACCESS_SECRET="your-very-secure-access-secret-key"
JWT_REFRESH_SECRET="your-very-secure-refresh-secret-key"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# Admin User (for seed)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!@#"
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U postgres -d crm
```

### Prisma Issues
```bash
# Regenerate Prisma Client
npm run prisma:generate

# Reset and reapply migrations
npm run prisma:migrate reset
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```






