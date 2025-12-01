# CRM Backend

Scalable CRM backend system built with NestJS, Prisma, PostgreSQL, and WebSockets.

## Features

- ✅ JWT Authentication (Access + Refresh tokens)
- ✅ RBAC (Role-Based Access Control)
- ✅ Contacts Management
- ✅ Deals Management
- ✅ Tasks Management
- ✅ Pipelines & Stages
- ✅ Custom Fields
- ✅ Activity Logging
- ✅ Comments
- ✅ File Management
- ✅ Import/Export
- ✅ WebSocket Real-time Updates
- ✅ System Logging

## Quick Start (GitHub Codespaces / Local Development)

### Prerequisites

- Node.js 18+ or 20+
- PostgreSQL 14+
- npm or yarn

### Installation Steps

#### 1. Install PostgreSQL and Client

```bash
# Update package list
sudo apt update

# Install PostgreSQL server
sudo apt install -y postgresql

# Install PostgreSQL client (for psql commands)
sudo apt install -y postgresql-client

# Start PostgreSQL service
sudo service postgresql start
```

#### 2. Setup Database

```bash
# Create database user (if needed)
sudo -u postgres createuser -s postgres

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"

# Create database for CRM
sudo -u postgres createdb crm_db
```

#### 3. Install Dependencies

```bash
npm install
```

#### 4. Setup Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env if needed (default values work for Codespaces)
```

#### 5. Generate Prisma Client

```bash
npx prisma generate
```

#### 6. Run Migrations

```bash
npx prisma migrate dev
```

#### 7. Create Admin User (Optional)

```bash
npm run create:admin
```

#### 8. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3001`
Swagger documentation at `http://localhost:3001/api/docs`

## Frontend Setup in Codespaces

### CORS Configuration

The backend is configured to accept requests from:
- **GitHub Codespaces**: All origins matching `https://*.app.github.dev`
- **Local Development**: `http://localhost:5173` and `http://localhost:3000`

CORS is enabled with:
- `credentials: true` - Allows cookies and authentication headers
- `allowedHeaders: ['Content-Type', 'Authorization']`
- `methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']`

### Frontend Environment Variables

Create `CRM/.env.local` in the frontend directory:

```env
# For GitHub Codespaces
VITE_API_URL="https://<your-codespace-name>-3001.app.github.dev/api"
VITE_WS_URL="https://<your-codespace-name>-3001.app.github.dev/realtime"

# For local development
# VITE_API_URL="http://localhost:3001/api"
# VITE_WS_URL="http://localhost:3001/realtime"
```

Replace `<your-codespace-name>` with your actual Codespace name (e.g., `obscure-spoon-966r594rg4hxj66`).

### Finding Your Codespace URL

1. In your Codespace, check the port forwarding:
   ```bash
   echo $CODESPACE_NAME
   echo $GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
   ```

2. Or check the port forwarding tab in VS Code/Cursor (usually shows `https://<name>-3001.app.github.dev`)

3. The frontend URL will be `https://<name>-3000.app.github.dev` (port 3000)
4. The backend API URL will be `https://<name>-3001.app.github.dev/api` (port 3001)

### Testing CORS

After setting up, test that CORS works:

```bash
# From frontend (should work)
curl -H "Origin: https://your-codespace-3000.app.github.dev" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://your-codespace-3001.app.github.dev/api/health
```

You should see CORS headers in the response.

## Running Backend in Codespaces

### Complete Setup Script

```bash
# 1. Install PostgreSQL
sudo apt update
sudo apt install -y postgresql postgresql-client

# 2. Start PostgreSQL
sudo service postgresql start

# 3. Setup Database
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';"
sudo -u postgres createdb crm_db

# 4. Install dependencies
npm install

# 5. Setup Environment
cp .env.example .env

# 6. Generate Prisma Client
npx prisma generate

# 7. Run migrations
npx prisma migrate dev

# 8. Create admin user (optional)
npm run create:admin

# 9. Start development server
npm run dev
```

### Connecting to PostgreSQL

```bash
# Connect via psql
psql -U postgres -d crm_db

# Or with password
PGPASSWORD=postgres psql -U postgres -d crm_db
```

### Running Migrations

```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Building and Running

```bash
# Build project
npm run build

# Run production build
npm run start:prod

# Run in development mode (with hot-reload)
npm run dev
```

## Project Structure

```
src/
├── auth/              # Authentication & Authorization
│   ├── dto/
│   ├── guards/
│   ├── strategies/
│   └── decorators/
├── users/             # User management
├── contacts/           # Contacts module
├── deals/             # Deals module
├── tasks/              # Tasks module
├── pipelines/          # Pipelines & Stages
├── custom-fields/      # Custom fields
├── activity/           # Activity logging
├── comments/           # Comments
├── files/              # File management
├── import-export/      # Import/Export
├── integrations/       # External integrations
├── websocket/          # WebSocket gateway
├── logging/            # System logging
└── common/             # Shared utilities
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/register` - Register (Admin only)

### Contacts
- `GET /api/contacts` - List contacts (with filters)
- `POST /api/contacts` - Create contact
- `GET /api/contacts/:id` - Get contact
- `GET /api/contacts/:id/stats` - Get contact statistics
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/deals/:id` - Get deal
- `PATCH /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## WebSocket Events

Connect to `/websocket` and subscribe to rooms:

- `deal:{id}` - Deal updates
- `contact:{id}` - Contact updates
- `task:{id}` - Task updates

Events:
- `deal.updated`
- `deal.field.updated`
- `contact.updated`
- `task.updated`
- `comment.created`
- `file.uploaded`

## Environment Variables

```env
# Database (for GitHub Codespaces / Local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_db"

# Application
JWT_ACCESS_SECRET="your-super-secret-jwt-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-key-change-in-production"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:5173"

# Email (optional)
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
SMTP_FROM=""

# File upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH="./uploads"

# VK Integration (optional)
VK_CONFIRMATION_CODE=""
VK_SECRET_KEY=""
```

## Available Scripts

```bash
# Development
npm run dev              # Start development server with hot-reload
npm run start:dev        # Alias for dev

# Production
npm run build            # Build project
npm run start:prod       # Run production build

# Prisma
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Admin
npm run create:admin     # Create admin user

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run E2E tests
npm run test:cov         # Run tests with coverage
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

## Troubleshooting

### PostgreSQL not starting

```bash
# Check PostgreSQL status
sudo service postgresql status

# Start PostgreSQL
sudo service postgresql start

# Check if PostgreSQL is listening
sudo netstat -tulpn | grep 5432
```

### Prisma connection errors

```bash
# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Regenerate Prisma Client
npx prisma generate
```

### Port already in use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

## Documentation

- [Architecture](./BACKEND_ARCHITECTURE.md)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)

## License

MIT
