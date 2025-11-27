# Настройка базы данных PostgreSQL

## Вариант 1: Установка через Homebrew (рекомендуется)

```bash
# Установка PostgreSQL
brew install postgresql@15

# Запуск PostgreSQL
brew services start postgresql@15

# Или запуск вручную
pg_ctl -D /opt/homebrew/var/postgresql@15 start
```

## Вариант 2: Использование Docker

Если у вас установлен Docker:

```bash
cd crm-backend
docker compose up -d postgres
```

## Вариант 3: Использование облачной базы данных

Можно использовать облачную базу данных (например, Supabase, Neon, или Railway) и указать URL в `.env`.

## После установки PostgreSQL

1. Создайте базу данных и пользователя:

```bash
# Подключитесь к PostgreSQL
psql postgres

# В psql выполните:
CREATE USER crm_user WITH PASSWORD 'crm_password';
CREATE DATABASE crm_db OWNER crm_user;
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
\q
```

2. Настройте `.env` файл:

```env
DATABASE_URL="postgresql://crm_user:crm_password@localhost:5432/crm_db?schema=public"
```

3. Примените миграции:

```bash
cd crm-backend
npm run prisma:migrate
```

4. Создайте администратора:

```bash
npm run check:admin
```



