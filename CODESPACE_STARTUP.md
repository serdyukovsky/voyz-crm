# Codespace Auto-Start Configuration

## Overview

The Codespace is configured to automatically start the backend server when opened. No manual intervention is required.

## Automatic Startup Flow

### 1. Post-Create Command (First Time Only)
When the Codespace is created for the first time, `.devcontainer/setup.sh` runs:
- Starts PostgreSQL
- Creates `.env` file if missing
- Installs backend dependencies
- Generates Prisma Client
- Runs database migrations

### 2. Post-Start Command (Every Time)
Every time the Codespace is opened, `.devcontainer/start-backend.sh` runs:
- Checks if backend is already running (skips if running)
- Waits for PostgreSQL to be ready
- Ensures dependencies are installed
- Generates Prisma Client if needed
- Starts backend server in background on port 3001

## Port Configuration

### Port 3001 (Backend API)
- **Status**: Automatically forwarded and set to **public**
- **URL**: `https://<codespace-name>-3001.app.github.dev`
- **Local**: `http://localhost:3001`
- **Swagger**: `http://localhost:3001/api/docs`

### Port 3000 (Frontend)
- **Status**: Forwarded (not public by default)
- **Local**: `http://localhost:3000`

### Port 5432 (PostgreSQL)
- **Status**: Forwarded silently
- **Local**: `localhost:5432`

## Verification

After opening the Codespace, verify backend is running:

```bash
# Check if backend process is running
ps aux | grep "nest start"

# Check if port 3001 is listening
lsof -i :3001

# Test API endpoint
curl http://localhost:3001/api/docs

# Check backend logs
tail -f /tmp/backend.log
```

## Manual Control

### Start Backend Manually
```bash
cd crm-backend
npm run start:dev
```

### Stop Backend
```bash
pkill -f "nest start"
```

### Restart Backend
```bash
pkill -f "nest start"
cd crm-backend
npm run start:dev
```

## Troubleshooting

### Backend Not Starting

1. **Check PostgreSQL is running:**
   ```bash
   sudo service postgresql status
   sudo service postgresql start
   ```

2. **Check backend logs:**
   ```bash
   tail -f /tmp/backend.log
   ```

3. **Check for port conflicts:**
   ```bash
   lsof -i :3001
   ```

4. **Manually start backend:**
   ```bash
   cd crm-backend
   npm run start:dev
   ```

### Port Not Accessible

1. **Check port forwarding in Codespaces UI:**
   - Open Codespace in browser
   - Go to "Ports" tab
   - Ensure port 3001 is set to "Public"

2. **Manually forward port:**
   ```bash
   gh codespace ports visibility 3001:public -c <codespace-name>
   ```

### Dependencies Issues

```bash
cd crm-backend
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

## Configuration Files

- **`.devcontainer/devcontainer.json`**: Main configuration
  - `postCreateCommand`: Runs once on creation
  - `postStartCommand`: Runs every time Codespace starts
  - `portsAttributes`: Port forwarding configuration

- **`.devcontainer/setup.sh`**: Initial setup script
  - Installs dependencies
  - Sets up database
  - Configures environment

- **`.devcontainer/start-backend.sh`**: Backend startup script
  - Checks if already running
  - Starts backend in background
  - Logs to `/tmp/backend.log`

## Expected Behavior

✅ **On Codespace Open:**
1. PostgreSQL starts automatically
2. Backend starts automatically (if not already running)
3. Port 3001 is forwarded and public
4. Backend is accessible at `https://<codespace>-3001.app.github.dev`

✅ **Backend Status:**
- Process: `nest start --watch`
- Port: `0.0.0.0:3001` (listening on all interfaces)
- Logs: `/tmp/backend.log`
- Auto-restart: Yes (watch mode)

## Notes

- Backend runs in watch mode, so code changes trigger automatic restart
- Backend logs are written to `/tmp/backend.log`
- If backend fails to start, check logs for errors
- Port 3001 is automatically set to public for external access


