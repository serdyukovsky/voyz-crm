# Быстрая настройка системы авторизации

## 🚀 Шаги для запуска

### 1. Обновить Prisma схему и создать миграцию

```bash
cd crm-backend

# Генерация Prisma Client
npm run prisma:generate

# Создание миграции для RefreshToken таблицы
npm run prisma:migrate dev --name add_refresh_tokens
```

### 2. Создать первого админа

```bash
# Запустить seed скрипт
npm run prisma:seed
```

Это создаст пользователя:
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: `ADMIN`

⚠️ **Важно**: Смените пароль после первого входа!

### 3. Настроить .env файл

Убедитесь, что в `.env` файле есть:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/crm"
JWT_SECRET="your-very-secret-key-change-this-in-production"
JWT_EXPIRES_IN="15m"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 4. Запустить приложение

```bash
npm run start:dev
```

## 📝 Проверка работы

### 1. Логин

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }'
```

Ответ:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@example.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "ADMIN"
  }
}
```

### 2. Регистрация нового пользователя (только для админа)

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "email": "manager@example.com",
    "password": "password123",
    "firstName": "Manager",
    "lastName": "User",
    "role": "MANAGER"
  }'
```

### 3. Получение списка пользователей

```bash
curl -X GET http://localhost:3001/api/users \
  -H "Authorization: Bearer <access_token>"
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

## 🔍 Swagger документация

После запуска приложения откройте:
```
http://localhost:3001/api/docs
```

Здесь вы найдете полную документацию API с возможностью тестирования.

## ✅ Что реализовано

- ✅ Регистрация (только для админа)
- ✅ Логин
- ✅ Refresh tokens (с хранением в БД)
- ✅ Роли (admin, manager)
- ✅ Permissions guard
- ✅ Глобальный JWT guard с поддержкой Public decorator
- ✅ Валидация DTOs
- ✅ Swagger документация

## 🎯 Следующие шаги

Теперь можно:
1. Подключать защиту к другим модулям (Deals, Tasks и т.д.)
2. Тестировать WebSocket с аутентификацией
3. Добавлять проверку прав доступа к эндпоинтам

## 📚 Дополнительная информация

См. `AUTH_GUIDE.md` для подробного руководства по использованию системы авторизации.





