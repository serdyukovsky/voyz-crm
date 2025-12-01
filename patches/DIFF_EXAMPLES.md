# Примеры изменений (Diff)

## Пример 1: API Base URL (deals.ts)

```diff
--- a/CRM/lib/api/deals.ts
+++ b/CRM/lib/api/deals.ts
@@ -1,4 +1,7 @@
-const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
+const API_BASE_URL = import.meta.env.VITE_API_URL
+if (!API_BASE_URL) {
+  throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
+}
```

## Пример 2: Auth Error Message (auth.ts)

```diff
--- a/CRM/lib/api/auth.ts
+++ b/CRM/lib/api/auth.ts
@@ -59,7 +62,8 @@ export async function login(credentials: LoginDto): Promise<LoginResponse> {
     return response.json()
   } catch (error) {
     if (error instanceof TypeError && error.message === 'Failed to fetch') {
-      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3001')
+      const apiUrl = import.meta.env.VITE_API_URL || 'backend server'
+      throw new Error(`Cannot connect to server at ${apiUrl}. Please check your VITE_API_URL configuration and ensure the backend is running.`)
     }
     throw error
   }
```

## Пример 3: WebSocket Connection (deals-kanban-board.tsx)

```diff
--- a/CRM/components/crm/deals-kanban-board.tsx
+++ b/CRM/components/crm/deals-kanban-board.tsx
@@ -731,7 +735,13 @@ export function DealsKanbanBoard({
     const token = localStorage.getItem('access_token')
     if (!token) return
 
-    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:3001/realtime', {
+    const wsUrl = import.meta.env.VITE_WS_URL
+    if (!wsUrl) {
+      console.error('VITE_WS_URL environment variable is not set. WebSocket connections will not work.')
+      return
+    }
+
+    const socket = io(wsUrl, {
       auth: { token },
       transports: ['websocket', 'polling'],
     })
```

## Пример 4: Hook API URL (use-deal.ts)

```diff
--- a/CRM/hooks/use-deal.ts
+++ b/CRM/hooks/use-deal.ts
@@ -90,7 +93,11 @@ export function useDeal({ dealId, realtime = false }: UseDealOptions) {
         throw new Error('No access token found')
       }
 
-      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
+      const API_BASE_URL = import.meta.env.VITE_API_URL
+      if (!API_BASE_URL) {
+        throw new Error('VITE_API_URL environment variable is not set. Please configure it in .env.local')
+      }
       console.log('Loading deal from API:', dealId)
```

