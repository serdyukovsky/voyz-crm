# Docker Setup для Backend

## Предварительные требования

1. **Установите Docker Desktop** (если еще не установлен):
   - macOS: https://www.docker.com/products/docker-desktop/
   - После установки запустите Docker Desktop

2. **Проверьте установку**:
   ```bash
   docker --version
   docker compose version
   ```

## Быстрый старт

### 1. Настройте переменные окружения

Скопируйте `.env.example` в `.env` (если еще не сделано):
```bash
cp .env.example .env
```

Отредактируйте `.env` при необходимости.

### 2. Запустите контейнеры

```bash
# Сборка и запуск в фоне
docker compose -f docker-compose.dev.yml up -d --build

# Или с логами в реальном времени
docker compose -f docker-compose.dev.yml up --build
```

### 3. Примените миграции базы данных

```bash
# Войдите в контейнер backend
docker compose -f docker-compose.dev.yml exec backend sh

# Внутри контейнера выполните:
npm run prisma:migrate
npm run create:admin
```

Или выполните команды напрямую:
```bash
docker compose -f docker-compose.dev.yml exec backend npm run prisma:migrate
docker compose -f docker-compose.dev.yml exec backend npm run create:admin
```

### 4. Проверьте работу

- Backend API: http://localhost:3001/api
- Swagger документация: http://localhost:3001/api/docs
- Health check: http://localhost:3001/api/health (если есть)

## Команды управления

### Просмотр логов
```bash
# Все сервисы
docker compose -f docker-compose.dev.yml logs -f

# Только backend
docker compose -f docker-compose.dev.yml logs -f backend

# Только postgres
docker compose -f docker-compose.dev.yml logs -f postgres
```

### Остановка контейнеров
```bash
docker compose -f docker-compose.dev.yml down
```

### Остановка с удалением volumes (удалит данные БД!)
```bash
docker compose -f docker-compose.dev.yml down -v
```

### Перезапуск
```bash
docker compose -f docker-compose.dev.yml restart backend
```

### Выполнение команд в контейнере
```bash
# Войти в контейнер
docker compose -f docker-compose.dev.yml exec backend sh

# Выполнить команду
docker compose -f docker-compose.dev.yml exec backend npm run prisma:studio
```

## Hot Reload

Hot reload настроен автоматически через `nest start --watch`. При изменении файлов в `src/` изменения применятся автоматически благодаря volume mount.

## Структура файлов

- `Dockerfile.dev` - Dockerfile для разработки с hot-reload
- `docker-compose.dev.yml` - Docker Compose конфигурация для разработки
- `.env.example` - Пример переменных окружения
- `.dockerignore` - Файлы, исключаемые из Docker образа

## Переменные окружения

Все переменные окружения читаются из `.env` файла. Основные:

- `DATABASE_URL` - URL подключения к PostgreSQL
- `JWT_ACCESS_SECRET` - Секрет для JWT токенов
- `JWT_REFRESH_SECRET` - Секрет для refresh токенов
- `PORT` - Порт backend сервера (по умолчанию 3001)
- `NODE_ENV` - Окружение (development/production)
- `FRONTEND_URL` - URL фронтенда для CORS

## Troubleshooting

### Проблема: Контейнер не запускается
```bash
# Проверьте логи
docker compose -f docker-compose.dev.yml logs backend

# Проверьте статус
docker compose -f docker-compose.dev.yml ps
```

### Проблема: База данных не подключается
```bash
# Проверьте, что postgres запущен
docker compose -f docker-compose.dev.yml ps postgres

# Проверьте логи postgres
docker compose -f docker-compose.dev.yml logs postgres
```

### Проблема: Hot reload не работает
- Убедитесь, что volumes правильно смонтированы
- Проверьте, что файлы изменяются в правильной директории
- Перезапустите контейнер: `docker compose -f docker-compose.dev.yml restart backend`

### Очистка и пересборка
```bash
# Остановить и удалить контейнеры
docker compose -f docker-compose.dev.yml down

# Пересобрать образы
docker compose -f docker-compose.dev.yml build --no-cache

# Запустить заново
docker compose -f docker-compose.dev.yml up -d
```

