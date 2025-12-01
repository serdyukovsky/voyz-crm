# DevContainer Configuration for CRM Project

## 🎯 Overview

This DevContainer configuration provides a complete development environment for the CRM project with:
- **OS**: Debian 12 (Bookworm) - Linux base
- **Node.js**: Version 20.x LTS
- **PostgreSQL**: Version 15.x
- **User**: vscode (non-root)

## 📦 What's Included

### Base Image
- `mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm`
- Based on Debian 12 (Bookworm) with Node.js 20 pre-installed
- Includes npm, git, and common development tools

### Features
- **PostgreSQL 15**: Automatically installed and configured
  - Database: `crm_db`
  - User: `vscode`
  - Password: `postgres`
  - Port: `5432`

### VS Code Extensions
- ESLint - JavaScript/TypeScript linting
- Prettier - Code formatting
- Prisma - Database schema management
- Tailwind CSS - CSS IntelliSense

### Port Forwarding
- `3000` - Frontend (Vite dev server)
- `3001` - Backend API (NestJS)
- `5432` - PostgreSQL database

## 🚀 Usage

### In GitHub Codespaces

1. Go to your repository on GitHub
2. Click **Code** → **Codespaces** → **Create codespace on main**
3. Wait 3-5 minutes for the environment to build
4. Everything will be set up automatically!

### In VS Code / Cursor

1. Install the **Remote - Containers** extension
2. Open Command Palette (`Cmd/Ctrl + Shift + P`)
3. Select: **Remote-Containers: Reopen in Container**
4. Wait for the container to build

### After Container Starts

The `setup.sh` script runs automatically and:
- Installs all backend dependencies
- Installs all frontend dependencies
- Generates Prisma Client
- Runs database migrations
- Creates `.env` file

### Starting the Application

**Backend:**
```bash
cd crm-backend
npm run create:admin  # Create admin user (first time only)
npm run start:dev     # Start backend
```

**Frontend:**
```bash
cd CRM
npm run dev           # Start frontend
```

## 🗄️ Database

### Connection String
```
postgresql://vscode:postgres@localhost:5432/crm_db?schema=public
```

### Access PostgreSQL
```bash
# Direct connection
psql -d crm_db

# Or via Prisma Studio
cd crm-backend
npx prisma studio
```

### Running Migrations
```bash
cd crm-backend
npx prisma migrate dev
```

## 🔧 Troubleshooting

### Container won't start
- Try rebuilding: `Cmd/Ctrl + Shift + P` → **Remote-Containers: Rebuild Container**
- Check Docker is running and has enough resources (4GB+ RAM recommended)

### PostgreSQL connection issues
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -U vscode -d crm_db

# Restart PostgreSQL (if needed)
sudo service postgresql restart
```

### Prisma issues
```bash
cd crm-backend

# Regenerate client
npx prisma generate

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

## 📚 Resources

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Codespaces Documentation](https://docs.github.com/en/codespaces)
- [Prisma Documentation](https://www.prisma.io/docs)

## ⚠️ Important Notes

### Why Debian/Ubuntu instead of Alpine?

Alpine Linux uses `musl libc` instead of `glibc`, which causes compatibility issues with:
- Prisma binary engines
- Many Node.js native modules
- OpenSSL library dependencies

**Debian (Bookworm)** ensures:
- ✅ Full Prisma compatibility
- ✅ Better npm package support
- ✅ Standard glibc library
- ✅ Reliable OpenSSL support

### Database Credentials

The default credentials (`vscode/postgres`) are **only for development**.

For production, always use:
- Strong passwords
- Environment variables
- Secure secret management

### Node Modules

The `node_modules` folders are created inside the container.
They are NOT synced to your local machine for performance reasons.

## 🔄 Updating

To update the DevContainer configuration:

1. Edit `.devcontainer/devcontainer.json` or `.devcontainer/setup.sh`
2. Commit and push changes
3. Rebuild container: `Cmd/Ctrl + Shift + P` → **Rebuild Container**

## 📝 Environment Variables

The setup script creates a `.env` file in `crm-backend/`:

```env
DATABASE_URL="postgresql://vscode:postgres@localhost:5432/crm_db?schema=public"
NODE_ENV=development
PORT=3001
JWT_ACCESS_SECRET=super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=super-secret-refresh-key-change-in-production
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL="http://localhost:3000"
```

Modify as needed for your setup.
