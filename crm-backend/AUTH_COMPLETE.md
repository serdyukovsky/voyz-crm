# ✅ Модуль авторизации полностью доработан

## 🎯 Реализовано

### 1. JWT AUTH — ACCESS + REFRESH Tokens ✅

- **Access Token:**
  - Срок жизни: 15 минут (настраивается через `ACCESS_TOKEN_EXPIRES_IN`)
  - Хранится только в памяти клиента (не в cookie)
  - Подписан `JWT_ACCESS_SECRET`

- **Refresh Token:**
  - Срок жизни: 30 дней (настраивается через `REFRESH_TOKEN_EXPIRES_IN`)
  - Хранится в HttpOnly Secure cookie
  - Подписан `JWT_REFRESH_SECRET`
  - Хранится в базе данных (привязка к userId)
  - Полная ротация: при обновлении refresh заменяется на новый
  - Защита от reuse attacks: если refresh перехвачен → все refresh'и пользователя инвалидируются

### 2. Cookies (refreshToken) ✅

Настроены HttpOnly cookies:
- `httpOnly: true`
- `secure: true` (в production)
- `sameSite: 'strict'`
- `path: '/api/auth/refresh'`
- `maxAge: 30 * 24 * 60 * 60 * 1000` (30 дней)

При logout — кука корректно удаляется.

### 3. Prisma: RefreshToken модель ✅

Обновлена модель:
```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@index([userId, expiresAt])
  @@map("refresh_tokens")
}
```

### 4. AuthService — полностью доработан ✅

**Логин:**
- ✅ Проверка пароля (argon2)
- ✅ Генерация access + refresh
- ✅ Запись refresh в БД
- ✅ Возврат access в JSON + refresh в cookie
- ✅ Обновление lastLoginAt

**Рефреш:**
- ✅ Проверка refresh токена (signature)
- ✅ Проверка срока годности
- ✅ Проверка что он есть в БД
- ✅ Удаление старого + генерация нового (rotation)
- ✅ Выдача новой пары access + refresh

**Логаут:**
- ✅ Удаление refresh токена из БД
- ✅ Полный logout (очистить cookie)

### 5. Guards & Decorators ✅

- ✅ `JwtAuthGuard` → использует Access Token
- ✅ `@CurrentUser()` достает данные пользователя из Access Token
- ✅ Все эндпоинты закрыты по умолчанию
- ✅ `@Public()` — только login, refresh, logout

### 6. Password hashing + validation ✅

- ✅ Используется **argon2** (вместо bcrypt)
- ✅ При регистрации → hash
- ✅ При логине → verify
- ✅ Минимальная сложность пароля (8 символов, uppercase, lowercase, number, special char)
- ✅ Проверка почты/логина на уникальность

### 7. Seeds ✅

- ✅ Seed админа (email/password из env переменных)
- ✅ Перед seed проверка: если админ существует → пропускать
- ✅ Использует `ADMIN_EMAIL` и `ADMIN_PASSWORD` из .env

### 8. Swagger ✅

- ✅ Скрыт refresh token (cookie)
- ✅ Описаны login/refresh/logout
- ✅ Добавлены схемы ответов
- ✅ Добавлена поддержка cookie auth в Swagger

### 9. ENV — приведен к рабочему виду ✅

Необходимые переменные:
```env
JWT_ACCESS_SECRET=your-very-secure-access-secret-key
JWT_REFRESH_SECRET=your-very-secure-refresh-secret-key
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=30d
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin123!@#
```

### 10. Автотесты ✅

Созданы тесты:
- ✅ login → ok
- ✅ refresh → ok
- ✅ logout → refresh удаляется
- ✅ запрос без токена → 401
- ✅ защита от reuse attacks

## 🚀 Установка и запуск

### 1. Установить зависимости

```bash
cd crm-backend
npm install
```

### 2. Настроить .env

Создайте `.env` файл на основе `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_ACCESS_SECRET="your-very-secure-access-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-very-secure-refresh-secret-key-change-in-production"
ACCESS_TOKEN_EXPIRES_IN="15m"
REFRESH_TOKEN_EXPIRES_IN="30d"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="Admin123!@#"
```

### 3. Сгенерировать Prisma Client и создать миграции

```bash
npm run prisma:generate
npm run prisma:migrate dev --name update_refresh_tokens
```

### 4. Создать админа

```bash
npm run prisma:seed
```

### 5. Запустить приложение

```bash
npm run start:dev
```

## 📝 API Endpoints

### POST /api/auth/login
**Public endpoint**

Request:
```json
{
  "email": "admin@example.com",
  "password": "Admin123!@#"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }
}
```

**Refresh token устанавливается в HttpOnly cookie автоматически.**

### POST /api/auth/refresh
**Public endpoint**

Request: (refresh token берется из cookie автоматически)

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Новый refresh token устанавливается в cookie автоматически.**

### POST /api/auth/logout
**Protected endpoint** (требует Access Token)

Request: (access token в header: `Authorization: Bearer <token>`)

Response:
```json
{
  "message": "Logged out successfully"
}
```

**Refresh token cookie удаляется автоматически.**

### POST /api/auth/register
**Protected endpoint** (только для админа)

Request:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "MANAGER"
}
```

## 🔒 Безопасность

1. **Access Token** - короткий срок жизни (15 минут)
2. **Refresh Token** - в HttpOnly cookie (недоступен для JavaScript)
3. **Token Rotation** - при каждом refresh создается новый refresh token
4. **Reuse Protection** - при обнаружении переиспользования все токены пользователя инвалидируются
5. **Argon2** - современный алгоритм хеширования паролей
6. **Password Validation** - строгие требования к паролю

## 🧪 Тестирование

Запустить тесты:
```bash
npm test
```

Запустить тесты с покрытием:
```bash
npm run test:cov
```

## 📚 Swagger

После запуска приложения:
- Swagger UI: http://localhost:3001/api/docs
- Все эндпоинты документированы
- Можно тестировать прямо из Swagger

## ✅ Финальная проверка

После изменений:

1. ✅ Сгенерировать миграции - `npm run prisma:migrate dev`
2. ✅ Проверить Swagger - http://localhost:3001/api/docs
3. ✅ Проверить refresh flow вручную
4. ✅ Проверить, что cookie устанавливается корректно

## 🎯 Готово к использованию

Модуль авторизации полностью готов. Можно безопасно:
- Тестировать защиту эндпоинтов
- Подключать WebSockets с аутентификацией
- Добавлять новые модули (Deals, Tasks, Contacts) с проверкой прав доступа

Все изменения внесены в существующий проект, ничего не сломано.





