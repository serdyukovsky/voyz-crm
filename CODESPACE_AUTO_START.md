# Codespace Auto-Start Configuration

## ✅ Configuration Complete

The Codespace is now configured to automatically start the backend server when opened.

## ⚠️ Important: Apply Changes

If you have an **existing Codespace**, you need to:

1. **Rebuild the container** to apply changes:
   - Open Command Palette (`Cmd/Ctrl + Shift + P`)
   - Select: **Codespaces: Rebuild Container**
   - Or delete and recreate the Codespace

2. **For new Codespaces**: Changes apply automatically on creation

## What Happens When You Open Codespace

### 1. First Time (postCreateCommand)
Runs `.devcontainer/setup.sh`:
- ✅ Starts PostgreSQL
- ✅ Creates `.env` file
- ✅ Installs dependencies
- ✅ Generates Prisma Client
- ✅ Runs migrations

### 2. Every Time (postStartCommand)
Runs `.devcontainer/start-backend.sh`:
- ✅ Checks if backend is already running
- ✅ Waits for PostgreSQL
- ✅ Ensures dependencies are installed
- ✅ **Starts backend automatically on port 3001**
- ✅ Backend runs in background with watch mode

## Result

**When you open the Codespace, the backend is already running!** 🎉

- ✅ Backend API: `http://localhost:3001`
- ✅ Swagger: `http://localhost:3001/api/docs`
- ✅ Public URL: `https://<codespace-name>-3001.app.github.dev`
- ✅ Port 3001 is automatically forwarded and set to **PUBLIC**

## Configuration Files

### `.devcontainer/devcontainer.json`
```json
{
  "postCreateCommand": "bash .devcontainer/setup.sh",
  "postStartCommand": "bash .devcontainer/start-backend.sh",
  "portsAttributes": {
    "3001": {
      "label": "Backend API",
      "onAutoForward": "notify",
      "visibility": "public"
    }
  }
}
```

### `.devcontainer/start-backend.sh`
- Checks if backend is running (prevents duplicates)
- Waits for PostgreSQL
- Starts backend in background
- Logs to `/tmp/backend.log`

## Verification

After opening Codespace, verify backend is running:

```bash
# Check process
ps aux | grep "nest start"

# Check port
lsof -i :3001

# Test API
curl http://localhost:3001/api/docs

# View logs
tail -f /tmp/backend.log
```

## Manual Control

### Restart Backend
```bash
pkill -f "nest start"
cd crm-backend
npm run start:dev
```

### Stop Backend
```bash
pkill -f "nest start"
```

### View Logs
```bash
tail -f /tmp/backend.log
```

## Troubleshooting

### Backend Not Starting Automatically

1. **Check script executed:**
   ```bash
   cat /tmp/backend.log
   ```

2. **Run manually:**
   ```bash
   bash .devcontainer/start-backend.sh
   ```

3. **Check PostgreSQL:**
   ```bash
   sudo service postgresql status
   sudo service postgresql start
   ```

### Port Not Public

1. **Check in Codespaces UI:**
   - Open "Ports" tab
   - Find port 3001
   - Set visibility to "Public"

2. **Or via CLI:**
   ```bash
   gh codespace ports visibility 3001:public -c <codespace-name>
   ```

## Notes

- Backend runs in **watch mode** - auto-restarts on code changes
- Backend logs are in `/tmp/backend.log`
- Port 3001 is **automatically public** for external access
- Script checks if backend is already running (idempotent)

## Expected Startup Time

- First time: ~2-3 minutes (install dependencies, migrations)
- Subsequent: ~10-15 seconds (just start backend)

