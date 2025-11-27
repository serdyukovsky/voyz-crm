# Исправление проблемы с входом

## Быстрая диагностика

Выполните эти шаги по порядку:

### 1. Проверьте бэкенд

```bash
cd crm-backend
npm run start:dev
```

Должно быть сообщение: `Application is running on: http://localhost:3001`

### 2. Проверьте базу данных

```bash
cd crm-backend
docker-compose up -d postgres
```

Или убедитесь, что локальный PostgreSQL запущен.

### 3. Проверьте и создайте администратора

```bash
cd crm-backend
npm run check:admin
```

Этот скрипт покажет:
- ✅ Подключение к базе данных работает
- ✅ Пользователь существует или создан
- ✅ Пароль правильный

### 4. Попробуйте войти снова

После выполнения всех шагов:
1. Откройте `http://localhost:3000/login`
2. Введите:
   - Email: `admin@example.com`
   - Password: `admin123`

### 5. Проверьте консоль браузера

Если все еще не работает:
1. Откройте консоль (F12)
2. Попробуйте войти
3. Посмотрите ошибки

**Возможные ошибки:**

- **"Cannot connect to server"** → Бэкенд не запущен (шаг 1)
- **"Invalid email or password"** → Пользователь не создан (шаг 3)
- **"API endpoint not found"** → Неправильный URL (проверьте NEXT_PUBLIC_API_URL)

### 6. Проверьте через API напрямую

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

Если получаете токен - API работает, проблема на фронтенде.
Если ошибка - проблема на бэкенде или в базе данных.

## Если ничего не помогает

1. Удалите пользователя через Prisma Studio:
   ```bash
   npm run prisma:studio
   ```
   Откройте `http://localhost:5555`, найдите пользователя и удалите его.

2. Создайте заново:
   ```bash
   npm run check:admin
   ```

3. Попробуйте войти снова.



