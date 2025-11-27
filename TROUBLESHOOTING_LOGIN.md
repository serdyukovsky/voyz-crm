# Решение проблем с входом в систему

## Шаг 1: Проверьте, запущен ли бэкенд

Убедитесь, что бэкенд запущен на порту 3001:

```bash
cd crm-backend
npm run start:dev
```

Вы должны увидеть сообщение типа:
```
[Nest] 12345  - 12/23/2024, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
```

## Шаг 2: Проверьте базу данных

Убедитесь, что PostgreSQL запущен:

```bash
cd crm-backend
docker-compose up -d postgres
```

Или если используете локальный PostgreSQL, убедитесь, что он запущен.

## Шаг 3: Проверьте и создайте администратора

Запустите скрипт проверки:

```bash
cd crm-backend
npm run check:admin
```

Этот скрипт:
- Проверит подключение к базе данных
- Проверит, существует ли пользователь
- Создаст пользователя, если его нет
- Проверит правильность пароля

## Шаг 4: Проверьте переменные окружения

Убедитесь, что в `crm-backend/.env` есть:

```env
DATABASE_URL="postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public"
```

## Шаг 5: Примените миграции

Если база данных пустая:

```bash
cd crm-backend
npm run prisma:migrate
```

## Шаг 6: Проверьте логи в браузере

1. Откройте консоль браузера (F12)
2. Попробуйте войти
3. Проверьте ошибки в консоли

Возможные ошибки:
- **"Cannot connect to server"** - бэкенд не запущен
- **"Invalid email or password"** - пользователь не существует или неправильный пароль
- **"API endpoint not found"** - неправильный URL API

## Шаг 7: Проверьте через Prisma Studio

Откройте Prisma Studio для просмотра данных:

```bash
cd crm-backend
npm run prisma:studio
```

Откройте `http://localhost:5555` и проверьте таблицу `users`.

## Альтернативный способ: Создание через SQL

Если скрипты не работают, создайте пользователя напрямую через SQL:

```sql
-- Подключитесь к базе данных
psql -U crm_user -d crm_db

-- Создайте пользователя (пароль нужно захешировать через argon2)
-- Или используйте Prisma Studio для создания
```

## Проверка через API напрямую

Проверьте, работает ли API авторизации:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Если получаете ошибку, проверьте логи бэкенда.

## Частые проблемы

### 1. "Cannot connect to database"
- Запустите PostgreSQL: `docker-compose up -d postgres`
- Проверьте DATABASE_URL в .env

### 2. "Invalid email or password"
- Убедитесь, что пользователь создан: `npm run check:admin`
- Проверьте, что email нормализован (lowercase)
- Убедитесь, что пароль правильный

### 3. "Cannot connect to server"
- Запустите бэкенд: `npm run start:dev`
- Проверьте, что бэкенд слушает на порту 3001
- Проверьте NEXT_PUBLIC_API_URL на фронтенде

### 4. Пользователь существует, но пароль не работает
- Удалите пользователя через Prisma Studio
- Создайте заново: `npm run check:admin`




