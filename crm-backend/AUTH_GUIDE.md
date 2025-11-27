# Руководство по системе авторизации

## ✅ Реализовано

### 1. Аутентификация (Auth)
- ✅ **Логин** (`POST /api/auth/login`) - вход в систему
- ✅ **Регистрация** (`POST /api/auth/register`) - создание нового пользователя (только для админа)
- ✅ **Refresh Token** (`POST /api/auth/refresh`) - обновление access token
- ✅ **Logout** (`POST /api/auth/logout`) - выход из системы

### 2. Управление пользователями (Users)
- ✅ **Создание пользователя** (`POST /api/users`) - только для админа
- ✅ **Получение списка пользователей** (`GET /api/users`) - требуется право `users.view`
- ✅ **Получение пользователя** (`GET /api/users/:id`) - требуется право `users.view`
- ✅ **Обновление пользователя** (`PATCH /api/users/:id`) - требуется право `users.manage`
- ✅ **Удаление пользователя** (`DELETE /api/users/:id`) - требуется право `users.manage`

### 3. Роли и права доступа
- ✅ **Роли**: `ADMIN`, `MANAGER`
- ✅ **Permissions Guard** - проверка прав доступа на уровне эндпоинтов
- ✅ **RBAC Guard** - проверка ролей и прав
- ✅ **JWT Strategy** - загрузка пользователя с permissions из БД

### 4. Безопасность
- ✅ **Refresh Tokens в БД** - хранение refresh tokens в базе данных
- ✅ **Глобальный JWT Guard** - все эндпоинты защищены по умолчанию
- ✅ **Public Decorator** - для публичных эндпоинтов (login, refresh)
- ✅ **Валидация DTOs** - проверка входных данных

## 📋 Структура

### Auth Module
```
src/auth/
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── refresh-token.dto.ts
│   └── auth-response.dto.ts
├── guards/
│   ├── jwt-auth.guard.ts (с поддержкой Public decorator)
│   └── local-auth.guard.ts
├── strategies/
│   ├── jwt.strategy.ts (загружает пользователя с permissions)
│   └── local.strategy.ts
├── decorators/
│   ├── public.decorator.ts
│   └── roles.decorator.ts
├── auth.controller.ts
├── auth.service.ts
└── auth.module.ts
```

### Users Module
```
src/users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
├── users.controller.ts
├── users.service.ts
└── users.module.ts
```

## 🔐 Использование

### 1. Публичные эндпоинты

Используйте декоратор `@Public()` для публичных эндпоинтов:

```typescript
import { Public } from '@/auth/decorators/public.decorator';

@Public()
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

### 2. Проверка прав доступа

Используйте декоратор `@Permissions()` для проверки прав:

```typescript
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/common/constants/permissions';

@Permissions(PERMISSIONS.DEALS_CREATE)
@Post()
async create(@Body() createDealDto: CreateDealDto) {
  // ...
}
```

### 3. Проверка ролей

Используйте декоратор `@Roles()` для проверки ролей:

```typescript
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN)
@Delete(':id')
async remove(@Param('id') id: string) {
  // ...
}
```

### 4. Получение текущего пользователя

Используйте декоратор `@CurrentUser()`:

```typescript
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@Get('profile')
async getProfile(@CurrentUser() user: any) {
  // user содержит: userId, id, email, role, permissions
  return user;
}
```

### 5. Guards в контроллере

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';

@Controller('deals')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DealsController {
  // ...
}
```

## 🔄 Refresh Token механизм

1. При логине пользователь получает `access_token` (15 минут) и `refresh_token` (7 дней)
2. `refresh_token` сохраняется в БД в таблице `refresh_tokens`
3. При обновлении токена:
   - Проверяется наличие токена в БД
   - Проверяется срок действия
   - Создается новый `access_token`
   - Старый `refresh_token` удаляется, создается новый (ротация)

## 📝 Примеры API запросов

### Логин
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }
}
```

### Регистрация (только для админа)
```bash
POST /api/auth/register
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "email": "manager@example.com",
  "password": "password123",
  "firstName": "Manager",
  "lastName": "User",
  "role": "MANAGER"
}
```

### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Защищенный эндпоинт
```bash
GET /api/users
Authorization: Bearer <access_token>
```

## 🗄️ База данных

### Новая таблица RefreshToken

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

### Миграция

После обновления schema.prisma выполните:

```bash
cd crm-backend
npm run prisma:migrate dev --name add_refresh_tokens
npm run prisma:generate
```

## 🔒 Права доступа (Permissions)

Все права определены в `src/common/constants/permissions.ts`:

- `ADMIN` - имеет все права
- `MANAGER` - имеет ограниченные права (см. `ROLE_PERMISSIONS`)

## ⚠️ Важные замечания

1. **Глобальный Guard**: Все эндпоинты защищены JWT по умолчанию. Используйте `@Public()` для публичных эндпоинтов.

2. **Регистрация**: Только админ может регистрировать новых пользователей через `/api/auth/register`.

3. **Refresh Tokens**: Хранятся в БД и автоматически удаляются при истечении срока действия.

4. **Permissions**: Загружаются из БД при каждом запросе через JWT Strategy.

5. **WebSocket**: Аутентификация через `client.handshake.auth?.token`.

## 🚀 Следующие шаги

1. Создать миграцию для RefreshToken таблицы
2. Создать seed скрипт для первого админа
3. Добавить rate limiting для защиты от брутфорса
4. Добавить email верификацию (опционально)
5. Добавить двухфакторную аутентификацию (опционально)





