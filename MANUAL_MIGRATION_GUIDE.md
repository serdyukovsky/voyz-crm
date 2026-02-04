# Руководство по применению миграции на сервере

## Проблема

Поле `link` было добавлено в модель Deal, но миграция не применена на dev сервере.
Из-за этого поиск по ссылке не работает.

## Решение

### Вариант 1: Автоматический (Push в GitHub)

Самый простой способ - сделать push в ветку `develop`:

```bash
cd "/Users/kosta/Documents/VOYZ/CRM Development"
git add .
git commit -m "Apply link field migration"
git push origin develop
```

GitHub webhook автоматически:
1. Подтянет код на сервер
2. Применит миграции
3. Перезапустит backend

**Подождите 1-2 минуты** после push, чтобы webhook сработал.

### Вариант 2: Ручное применение через SSH

Если нужно применить миграцию вручную:

```bash
# 1. Подключитесь к серверу
ssh root@91.210.106.218
# Пароль: 5nlT3rry_4

# 2. Перейдите в директорию dev backend
cd /root/crm-backend-dev

# 3. Проверьте статус миграций
npx prisma migrate status

# 4. Примените миграцию
npx prisma migrate deploy

# 5. Перезапустите backend
pm2 restart crm-backend-dev

# 6. Проверьте логи
pm2 logs crm-backend-dev --lines 50

# 7. Выйдите
exit
```

### Вариант 3: Использование sshpass (если не хотите вводить пароль)

```bash
sshpass -p '5nlT3rry_4' ssh root@91.210.106.218 << 'ENDSSH'
cd /root/crm-backend-dev
echo "=== Checking migration status ==="
npx prisma migrate status
echo ""
echo "=== Applying migrations ==="
npx prisma migrate deploy
echo ""
echo "=== Restarting backend ==="
pm2 restart crm-backend-dev
echo ""
echo "Done!"
ENDSSH
```

## Проверка

После применения миграции проверьте:

### 1. Backend доступен
```bash
curl http://91.210.106.218:3001/api/health
```

Должно вернуть: `{"status":"ok","timestamp":"..."}`

### 2. Поле link присутствует

Создайте тестовую сделку с ссылкой и выполните поиск:

```bash
# Получите access_token (через login в UI или API)
# Затем проверьте поиск
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://91.210.106.218:3001/api/deals?search=test"
```

### 3. Frontend работает

1. Запустите frontend локально:
```bash
cd "/Users/kosta/Documents/VOYZ/CRM Development/CRM"
npm run dev
```

2. Откройте http://localhost:5173
3. Войдите (admin@example.com / admin123)
4. Попробуйте:
   - Открыть страницу Tasks (/tasks)
   - Выполнить поиск по сделкам

## Страница Tasks не открывается - Диагностика

Если страница задач не открывается, проверьте в консоли браузера (F12):

### Возможные ошибки:

1. **CORS error**: Backend не разрешает запросы с localhost:5173
   - Решение: Проверьте CORS настройки в main.ts на сервере

2. **401 Unauthorized**: Токен недействителен
   - Решение: Разлогиньтесь и залогиньтесь снова

3. **Network error**: Backend не отвечает
   - Решение: Проверьте, что backend запущен (pm2 status)

4. **404 Not Found**: Endpoint не найден
   - Решение: Проверьте, что routes правильно зарегистрированы

### Команды для диагностики на сервере:

```bash
ssh root@91.210.106.218

# Проверить статус backend
pm2 status

# Посмотреть логи
pm2 logs crm-backend-dev --lines 100

# Перезапустить если нужно
pm2 restart crm-backend-dev

# Проверить, что порт 3001 слушается
netstat -tuln | grep 3001
```

## Статус миграции

Миграция `20260202172654_add_deal_link_field` должна быть в списке:

```
Status: up
Migration: 20260202172654_add_deal_link_field
```

Если статус `pending`, нужно выполнить `npx prisma migrate deploy`.

## Быстрая проверка всего

```bash
# На локальной машине
cd "/Users/kosta/Documents/VOYZ/CRM Development"

# Проверка 1: Backend жив
curl http://91.210.106.218:3001/api/health

# Проверка 2: Frontend стартует
cd CRM && npm run dev

# Проверка 3: Миграция применена (через SSH)
sshpass -p '5nlT3rry_4' ssh root@91.210.106.218 \
  "cd /root/crm-backend-dev && npx prisma migrate status"
```

Все три команды должны выполниться успешно.
