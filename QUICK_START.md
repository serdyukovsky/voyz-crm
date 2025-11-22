# Быстрый старт - Создание администратора

## Шаг 1: Запустите базу данных

```bash
cd crm-backend
docker-compose up -d postgres
```

Или если у вас уже установлен PostgreSQL локально, убедитесь, что он запущен.

## Шаг 2: Настройте DATABASE_URL

Убедитесь, что в файле `crm-backend/.env` есть:

```env
DATABASE_URL="postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public"
```

Если используете Docker Compose, URL будет таким. Если локальный PostgreSQL, измените на свои данные.

## Шаг 3: Примените миграции

```bash
cd crm-backend
npm run prisma:migrate
```

## Шаг 4: Создайте администратора

```bash
npm run create:admin
```

По умолчанию создастся:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## Шаг 5: Запустите бэкенд

```bash
npm run start:dev
```

## Шаг 6: Войдите в систему

1. Откройте фронтенд: `http://localhost:3000`
2. Перейдите на `/login`
3. Введите:
   - Email: `admin@example.com`
   - Password: `admin123`

## Настройка своих данных администратора

Если хотите использовать свои данные:

```bash
ADMIN_EMAIL=your-email@example.com \
ADMIN_PASSWORD=your-password \
ADMIN_FIRST_NAME=Your \
ADMIN_LAST_NAME=Name \
npm run create:admin
```

## Проверка

После входа вы должны увидеть:
- Канбан-доску со сделками (если они есть)
- Доступ ко всем функциям CRM
- Настройки пользователей в `/settings/users`

