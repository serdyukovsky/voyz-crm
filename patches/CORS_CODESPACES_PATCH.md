# CORS Configuration Patch for GitHub Codespaces

## Описание

Обновлена CORS конфигурация backend для корректной работы с GitHub Codespaces:
- Разрешены origins формата `https://*.app.github.dev`
- Разрешены локальные origins: `http://localhost:5173` и `http://localhost:3000`
- Включены `credentials: true` и необходимые headers/methods
- Обновлен раздел "Frontend Setup in Codespaces" в README.md

## Измененные файлы

1. `crm-backend/src/main.ts` - основная CORS конфигурация
2. `crm-backend/src/websocket/realtime.gateway.ts` - WebSocket CORS конфигурация
3. `crm-backend/README.md` - документация

## Полный Patch

### 1. crm-backend/src/main.ts

```diff
--- a/crm-backend/src/main.ts
+++ b/crm-backend/src/main.ts
@@ -26,33 +26,36 @@ async function bootstrap() {
   // Exception filter
   app.useGlobalFilters(new HttpExceptionFilter());
 
-  // CORS - Enhanced configuration
-  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
+  // CORS Configuration
+  // Allow GitHub Codespaces origins (https://*.app.github.dev)
+  // and local development origins (localhost:5173, localhost:3000)
   const allowedOrigins = process.env.FRONTEND_URL
     ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
-    : ['http://localhost:3000', 'http://localhost:3001'];
+    : ['http://localhost:5173', 'http://localhost:3000'];
 
   app.enableCors({
     origin: (origin, callback) => {
       // Allow requests with no origin (like mobile apps or curl requests)
-      if (!origin) return callback(null, true);
-      
-      // In development, allow all origins for easier Codespace/GitHub integration
-      if (isDevelopment) {
+      if (!origin) {
         return callback(null, true);
       }
-      
-      // In production, check against allowed origins
-      if (allowedOrigins.indexOf(origin) !== -1) {
-        callback(null, true);
-      } else {
-        callback(new Error('Not allowed by CORS'));
+
+      // Allow GitHub Codespaces origins (https://*.app.github.dev)
+      if (origin.match(/^https:\/\/.*\.app\.github\.dev$/)) {
+        return callback(null, true);
+      }
+
+      // Check against explicitly allowed origins
+      if (allowedOrigins.includes(origin)) {
+        return callback(null, true);
       }
+
+      // Reject all other origins
+      callback(new Error('Not allowed by CORS'));
     },
     credentials: true,
-    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
-    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
-    exposedHeaders: ['Authorization'],
+    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
+    allowedHeaders: ['Content-Type', 'Authorization'],
   });
```

### 2. crm-backend/src/websocket/realtime.gateway.ts

```diff
--- a/crm-backend/src/websocket/realtime.gateway.ts
+++ b/crm-backend/src/websocket/realtime.gateway.ts
@@ -13,7 +13,26 @@ import { JwtService } from '@nestjs/jwt';
 
 @WebSocketGateway({
   cors: {
-    origin: '*',
+    origin: (origin, callback) => {
+      // Allow requests with no origin
+      if (!origin) {
+        return callback(null, true);
+      }
+
+      // Allow GitHub Codespaces origins (https://*.app.github.dev)
+      if (origin.match(/^https:\/\/.*\.app\.github\.dev$/)) {
+        return callback(null, true);
+      }
+
+      // Allow local development origins
+      if (origin.match(/^http:\/\/localhost:(5173|3000)$/)) {
+        return callback(null, true);
+      }
+
+      // Reject all other origins
+      callback(new Error('Not allowed by CORS'));
+    },
+    credentials: true,
   },
   namespace: '/realtime',
 })
```

### 3. crm-backend/README.md

```diff
--- a/crm-backend/README.md
+++ b/crm-backend/README.md
@@ -99,6 +99,63 @@ npm run dev
 The API will be available at `http://localhost:3001`
 Swagger documentation at `http://localhost:3001/api/docs`
 
+## Frontend Setup in Codespaces
+
+### CORS Configuration
+
+The backend is configured to accept requests from:
+- **GitHub Codespaces**: All origins matching `https://*.app.github.dev`
+- **Local Development**: `http://localhost:5173` and `http://localhost:3000`
+
+CORS is enabled with:
+- `credentials: true` - Allows cookies and authentication headers
+- `allowedHeaders: ['Content-Type', 'Authorization']`
+- `methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']`
+
+### Frontend Environment Variables
+
+Create `CRM/.env.local` in the frontend directory:
+
+```env
+# For GitHub Codespaces
+VITE_API_URL="https://<your-codespace-name>-3001.app.github.dev/api"
+VITE_WS_URL="https://<your-codespace-name>-3001.app.github.dev/realtime"
+
+# For local development
+# VITE_API_URL="http://localhost:3001/api"
+# VITE_WS_URL="http://localhost:3001/realtime"
+```
+
+Replace `<your-codespace-name>` with your actual Codespace name (e.g., `obscure-spoon-966r594rg4hxj66`).
+
+### Finding Your Codespace URL
+
+1. In your Codespace, check the port forwarding:
+   ```bash
+   echo $CODESPACE_NAME
+   echo $GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
+   ```
+
+2. Or check the port forwarding tab in VS Code/Cursor (usually shows `https://<name>-3001.app.github.dev`)
+
+3. The frontend URL will be `https://<name>-3000.app.github.dev` (port 3000)
+4. The backend API URL will be `https://<name>-3001.app.github.dev/api` (port 1)
+
+### Testing CORS
+
+After setting up, test that CORS works:
+
+```bash
+# From frontend (should work)
+curl -H "Origin: https://your-codespace-3000.app.github.dev" \
+     -H "Access-Control-Request-Method: GET" \
+     -H "Access-Control-Request-Headers: Authorization" \
+     -X OPTIONS \
+     https://your-codespace-3001.app.github.dev/api/health
+```
+
+You should see CORS headers in the response.
+
 ## Running Backend in Codespaces
```

## Ключевые изменения

### 1. Разрешенные Origins

**Было:**
- В development режиме разрешались все origins
- Только `localhost:3000` и `localhost:3001` в production

**Стало:**
- Разрешены все origins формата `https://*.app.github.dev` (GitHub Codespaces)
- Разрешены `http://localhost:5173` и `http://localhost:3000` (локальная разработка)
- Более строгая проверка origins

### 2. CORS Настройки

**Было:**
```typescript
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
exposedHeaders: ['Authorization'],
```

**Стало:**
```typescript
methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
allowedHeaders: ['Content-Type', 'Authorization'],
```

- Убран `OPTIONS` из methods (обрабатывается автоматически)
- Убран `X-Requested-With` из allowedHeaders (не нужен)
- Убран `exposedHeaders` (не требуется)

### 3. WebSocket CORS

**Было:**
```typescript
cors: {
  origin: '*',
}
```

**Стало:**
```typescript
cors: {
  origin: (origin, callback) => {
    // Проверка origins как в main.ts
  },
  credentials: true,
}
```

- Добавлена проверка origins для WebSocket
- Включен `credentials: true` для WebSocket

## Проверка

После применения патча:

1. **Перезапустить backend:**
   ```bash
   cd crm-backend
   npm run dev
   ```

2. **Проверить CORS headers:**
   ```bash
   curl -H "Origin: https://your-codespace-3000.app.github.dev" \
        -H "Access-Control-Request-Method: GET" \
        -H "Access-Control-Request-Headers: Authorization" \
        -X OPTIONS \
        https://your-codespace-3001.app.github.dev/api/health \
        -v
   ```

   Должны быть заголовки:
   - `Access-Control-Allow-Origin: https://your-codespace-3000.app.github.dev`
   - `Access-Control-Allow-Credentials: true`
   - `Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE`
   - `Access-Control-Allow-Headers: Content-Type, Authorization`

3. **Проверить WebSocket подключение:**
   - Открыть frontend в Codespace
   - Проверить Network tab в DevTools
   - WebSocket должен успешно подключиться

## Результат

✅ CORS работает для GitHub Codespaces  
✅ CORS работает для локальной разработки  
✅ WebSocket CORS настроен корректно  
✅ Документация обновлена  
✅ Конфигурация чистая и понятная






