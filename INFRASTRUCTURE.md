# CRM Infrastructure Setup

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  https://tripsystem.ru                                           │
│         │                                                         │
│         ▼                                                         │
│  ┌─────────────┐                                                 │
│  │   Nginx     │  (port 80/443)                                  │
│  │  Reverse    │                                                 │
│  │   Proxy     │                                                 │
│  └──────┬──────┘                                                 │
│         │                                                         │
│         ├─────► /api/      ──► localhost:3002 (Prod Backend)    │
│         ├─────► /socket.io/──► localhost:3002 (Prod Backend WS) │
│         └─────► /          ──► /var/www/crm-frontend (Static)   │
│                                                                   │
│  ┌───────────────────────┐        ┌──────────────────┐          │
│  │  Prod Backend (PM2)   │───────►│  PostgreSQL      │          │
│  │  Port: 3002           │        │  DB: crm_prod    │          │
│  │  /root/crm-backend-   │        │  User: crm_user  │          │
│  │        prod            │        └──────────────────┘          │
│  └───────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        DEVELOPMENT                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  LOCAL MACHINE                    REMOTE SERVER                  │
│  ──────────────                   ─────────────                  │
│                                                                   │
│  http://localhost:5173            91.210.106.218:3001           │
│  (Vite Dev Server)                                               │
│         │                                                         │
│         │                                                         │
│         └──────────────────────────► localhost:3001             │
│           HTTP requests              (Dev Backend)               │
│           via .env.local                   │                     │
│                                            ▼                     │
│                                   ┌──────────────────┐          │
│                                   │  PostgreSQL      │          │
│                                   │  DB: crm_dev     │          │
│                                   │  User: crm_user  │          │
│                                   └──────────────────┘          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Services and Ports

| Service | Environment | Port | Database | PM2 Process |
|---------|------------|------|----------|-------------|
| Backend | Production | 3002 | crm_prod | crm-backend-prod (id: 1) |
| Backend | Development | 3001 | crm_dev | crm-backend-dev (id: 8) |
| Frontend | Production | 5173* | - | crm-frontend-dev (id: 4) |
| Frontend | Development | 5173 | - | Local Vite |
| Nginx | Production | 80/443 | - | systemd |

*Note: Production frontend is served as static files through Nginx from `/var/www/crm-frontend`, but PM2 also runs a Vite dev server on port 5173.

## Configuration Files

### Backend Configuration

#### Production Backend
- **Location**: `/root/crm-backend-prod/`
- **Config**: `/root/crm-backend-prod/.env`
```env
NODE_ENV=production
PORT=3002
DATABASE_URL="postgresql://crm_user:crm_password123@localhost:5432/crm_prod?schema=public"
JWT_ACCESS_SECRET=prod_jwt_access_secret_32chars_minimum_change_me
JWT_REFRESH_SECRET=prod_jwt_refresh_secret_32chars_minimum_change_me
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
FRONTEND_URL=https://tripsystem.ru,http://tripsystem.ru
COOKIE_DOMAIN=tripsystem.ru
MAX_FILE_SIZE=52428800
```

#### Development Backend
- **Location**: `/root/crm-backend-dev/`
- **Config**: `/root/crm-backend-dev/.env`
```env
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://crm_user:crm_password123@localhost:5432/crm_dev"
JWT_SECRET=dev_jwt_secret_32chars_minimum
GITHUB_WEBHOOK_SECRET=5dcccbb2da954025d0d2b2090c893ae91db23fa1ffffc1952ad773036b725231
CRM_BACKEND_DEV_PATH=/root/crm-backend-dev
CRM_BACKEND_PROD_PATH=/root/crm-backend-prod
API_URL=http://localhost:3001/api
CORS_ORIGIN=http://localhost:5173
MAX_FILE_SIZE=52428800
```

### Frontend Configuration

#### Production Frontend
- **Location**: `/root/crm-frontend/`
- **Config**: `/root/crm-frontend/.env`
```env
VITE_API_URL=https://tripsystem.ru/api
VITE_WS_URL=wss://tripsystem.ru
```

#### Development Frontend (Local)
- **Location**: `/Users/kosta/Documents/VOYZ/CRM Development/CRM/`
- **Config**: `/Users/kosta/Documents/VOYZ/CRM Development/CRM/.env.local`
```env
VITE_API_URL=http://91.210.106.218:3001/api
VITE_WS_URL=ws://91.210.106.218:3001
```

### Nginx Configuration
- **Location**: `/etc/nginx/sites-available/crm`
- **Symlink**: `/etc/nginx/sites-enabled/crm`

**Key settings:**
```nginx
location /api/ {
    proxy_pass http://localhost:3002;  # MUST BE 3002 for prod backend
    ...
}

location /socket.io/ {
    proxy_pass http://localhost:3002;  # MUST BE 3002 for prod backend
    ...
}
```

## Database Setup

### PostgreSQL Databases
```sql
-- Production database
Database: crm_prod
User: crm_user
Password: crm_password123

-- Development database
Database: crm_dev
User: crm_user
Password: crm_password123
```

### Verify Database Connection
```bash
# Check prod database
psql -U crm_user -d crm_prod -c "SELECT COUNT(*) FROM \"Deal\";"

# Check dev database
psql -U crm_user -d crm_dev -c "SELECT COUNT(*) FROM \"Deal\";"
```

## How to Start Everything

### On Remote Server (ssh root@91.210.106.218)

#### Start Backend Services
```bash
# Start both backends
pm2 start crm-backend-prod
pm2 start crm-backend-dev

# Verify they're running on correct ports
pm2 logs crm-backend-prod --lines 5 | grep "Application is running"
pm2 logs crm-backend-dev --lines 5 | grep "Application is running"

# Should see:
# crm-backend-prod: Application is running on: http://localhost:3002
# crm-backend-dev: Application is running on: http://localhost:3001

# Check ports are listening
lsof -i :3001  # Should show crm-backend-dev
lsof -i :3002  # Should show crm-backend-prod
```

#### Restart Nginx
```bash
# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Check status
systemctl status nginx
```

### On Local Machine

#### Start Development Frontend
```bash
cd "/Users/kosta/Documents/VOYZ/CRM Development/CRM"

# Verify .env.local is correct
cat .env.local
# Should show:
# VITE_API_URL=http://91.210.106.218:3001/api
# VITE_WS_URL=ws://91.210.106.218:3001

# Start Vite dev server
npm run dev

# Open http://localhost:5173
```

## Verification Checklist

### After Starting Services

1. **Check Backend Ports**:
```bash
# On server
lsof -i :3001 | grep node  # Should show crm-backend-dev
lsof -i :3002 | grep node  # Should show crm-backend-prod
```

2. **Check PM2 Status**:
```bash
pm2 status
# All should show "online"
```

3. **Check Nginx Configuration**:
```bash
cat /etc/nginx/sites-available/crm | grep proxy_pass
# Both should show http://localhost:3002
```

4. **Test API Endpoints**:
```bash
# Test prod backend
curl http://localhost:3002/api/health

# Test dev backend
curl http://localhost:3001/api/health

# Test prod through nginx
curl https://tripsystem.ru/api/health
```

5. **Check Databases Are Different**:
```bash
# On server
psql -U crm_user -d crm_prod -c "SELECT name FROM \"Pipeline\" ORDER BY name;"
psql -U crm_user -d crm_dev -c "SELECT name FROM \"Pipeline\" ORDER BY name;"
# Should show different results
```

6. **Verify Frontend Connections**:
- Open https://tripsystem.ru → should connect to prod backend (port 3002, crm_prod database)
- Open http://localhost:5173 → should connect to dev backend (port 3001, crm_dev database)
- **Data should be DIFFERENT between the two**

## Troubleshooting

### Problem: Port Already in Use

**Symptom**: `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001`

**Solution**:
```bash
# Find process on port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Restart PM2 service
pm2 restart crm-backend-dev
```

### Problem: Both Frontends Show Same Data

**Possible Causes**:

1. **Wrong nginx configuration**:
```bash
# Check nginx config
cat /etc/nginx/sites-available/crm | grep proxy_pass
# Should be http://localhost:3002 (NOT 3001)

# Fix if needed
sed -i 's|http://localhost:3001|http://localhost:3002|g' /etc/nginx/sites-available/crm
nginx -t
systemctl reload nginx
```

2. **Backend on wrong port**:
```bash
# Check actual ports
pm2 logs crm-backend-prod --lines 5 | grep "Application is running"
pm2 logs crm-backend-dev --lines 5 | grep "Application is running"

# Should show:
# prod: http://localhost:3002
# dev: http://localhost:3001

# If wrong, check .env files and restart
pm2 restart all
```

3. **Browser cache**:
- Clear localStorage: DevTools → Application → Local Storage → Delete all
- Hard refresh: Ctrl+Shift+R
- Re-login to both frontends

### Problem: Dev Backend Won't Start on Port 3001

**Check**:
```bash
# See what's using port 3001
lsof -i :3001

# If it's prod backend, check its .env
cat /root/crm-backend-prod/.env | grep PORT
# Should ONLY have: PORT=3002
# If you see PORT=3001, remove it:
sed -i '/^PORT=3001$/d' /root/crm-backend-prod/.env
pm2 restart crm-backend-prod
```

### Problem: Can't Connect to Remote Backend from Local Frontend

**Check**:
1. Dev backend is running: `pm2 status crm-backend-dev`
2. Port 3001 is accessible: `curl http://91.210.106.218:3001/api/health`
3. Firewall allows port 3001: `ufw status` (should allow 3001)
4. .env.local on local machine is correct (VITE_API_URL=http://91.210.106.218:3001/api)

## Important Notes

### Don't Mix Environments

- **Production frontend** (tripsystem.ru) → **Production backend** (port 3002) → **crm_prod database**
- **Development frontend** (localhost:5173) → **Development backend** (port 3001) → **crm_dev database**

### Port Assignment Rules

- **3001**: ALWAYS development backend (crm-backend-dev)
- **3002**: ALWAYS production backend (crm-backend-prod)
- **5173**: Vite dev server (both prod and dev frontends use this, but prod is served as static files through nginx)
- **80/443**: Nginx (production only)

### Critical Files to Never Mix Up

| File | Environment | Purpose |
|------|-------------|---------|
| `/root/crm-backend-prod/.env` | Production | Backend config, PORT=3002 |
| `/root/crm-backend-dev/.env` | Development | Backend config, PORT=3001 |
| `/root/crm-frontend/.env` | Production | Frontend config, API URL=https://tripsystem.ru/api |
| `local CRM/.env.local` | Development | Frontend config, API URL=http://91.210.106.218:3001/api |
| `/etc/nginx/sites-available/crm` | Production | Nginx config, proxy to 3002 |

### When Making Changes

1. **Backend code changes**: Restart appropriate PM2 process
   ```bash
   pm2 restart crm-backend-prod  # or crm-backend-dev
   ```

2. **Nginx config changes**: Test and reload
   ```bash
   nginx -t && systemctl reload nginx
   ```

3. **Frontend code changes**:
   - Prod: Build and deploy to `/var/www/crm-frontend`
   - Dev: Vite auto-reloads

4. **Environment variable changes**: Restart services
   ```bash
   pm2 restart crm-backend-prod --update-env
   ```

## Quick Commands Reference

```bash
# Server SSH
ssh root@91.210.106.218
# Password: 5nlT3rry_4

# PM2 Commands
pm2 status                           # Check all processes
pm2 logs crm-backend-prod --lines 20 # View prod backend logs
pm2 logs crm-backend-dev --lines 20  # View dev backend logs
pm2 restart all                      # Restart all services
pm2 restart crm-backend-prod         # Restart prod backend only

# Nginx Commands
nginx -t                             # Test configuration
systemctl reload nginx               # Reload nginx
systemctl status nginx               # Check nginx status

# Database Commands
psql -U crm_user -d crm_prod        # Connect to prod DB
psql -U crm_user -d crm_dev         # Connect to dev DB

# Port Check
lsof -i :3001                       # Check port 3001
lsof -i :3002                       # Check port 3002
netstat -tuln | grep 300           # Alternative port check

# Process Management
ps aux | grep node                  # Find node processes
kill -9 <PID>                      # Kill process by PID
```

## Backup and Recovery

### Backup Production Database
```bash
pg_dump -U crm_user crm_prod > crm_prod_backup_$(date +%Y%m%d).sql
```

### Restore to Development
```bash
# Drop and recreate dev database
psql -U crm_user -c "DROP DATABASE IF EXISTS crm_dev;"
psql -U crm_user -c "CREATE DATABASE crm_dev;"

# Restore from prod backup
psql -U crm_user crm_dev < crm_prod_backup_YYYYMMDD.sql
```

---

**Last Updated**: February 2, 2026
**Maintained By**: Development Team
