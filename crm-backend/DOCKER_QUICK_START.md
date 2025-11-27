# Быстрый старт с Docker

## 1. Установите Docker Desktop

Если Docker не установлен:
- macOS: https://www.docker.com/products/docker-desktop/
- Запустите Docker Desktop после установки

## 2. Запустите backend

```bash
cd crm-backend

# Сборка и запуск
docker compose -f docker-compose.dev.yml up -d --build

# Просмотр логов
docker compose -f docker-compose.dev.yml logs -f backend
```

## 3. Примените миграции и создайте админа

```bash
# Миграции
docker compose -f docker-compose.dev.yml exec backend npm run prisma:migrate

# Создание администратора
docker compose -f docker-compose.dev.yml exec backend npm run create:admin
```

## 4. Проверьте работу

- API: http://localhost:3001/api
- Swagger: http://localhost:3001/api/docs

## Остановка

```bash
docker compose -f docker-compose.dev.yml down
```
