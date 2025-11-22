# Создание администратора

## Предварительные требования

**Важно:** Перед созданием администратора убедитесь, что:
1. База данных запущена (PostgreSQL на порту 5432)
2. Переменная окружения `DATABASE_URL` настроена в `.env` файле
3. Миграции применены: `npm run prisma:migrate`

## Быстрый способ

Запустите скрипт для создания администратора:

```bash
npm run create:admin
```

По умолчанию создастся пользователь:
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Role**: `ADMIN`

## Настройка через переменные окружения

Вы можете настроить данные администратора через переменные окружения:

```bash
ADMIN_EMAIL=your-email@example.com \
ADMIN_PASSWORD=your-secure-password \
ADMIN_FIRST_NAME=Your \
ADMIN_LAST_NAME=Name \
npm run create:admin
```

## Альтернативный способ (через Prisma Studio)

1. Запустите Prisma Studio:
   ```bash
   npm run prisma:studio
   ```

2. Откройте браузер на `http://localhost:5555`
3. Перейдите в таблицу `users`
4. Создайте нового пользователя:
   - `email`: ваш email
   - `password`: хеш пароля (используйте argon2 для хеширования)
   - `firstName`: ваше имя
   - `lastName`: ваша фамилия
   - `role`: `ADMIN`
   - `isActive`: `true`

## Хеширование пароля

Если вы создаете пользователя вручную, вам нужно захешировать пароль. Используйте Node.js:

```javascript
const argon2 = require('argon2');
const hash = await argon2.hash('your-password');
console.log(hash);
```

Или используйте онлайн-генератор для argon2 (не рекомендуется для продакшена).

## После создания

После создания администратора вы можете войти в систему:
1. Откройте `/login` на фронтенде
2. Введите email и password
3. После успешного входа вы будете перенаправлены на главную страницу

