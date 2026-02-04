# 🚨 Срочно: Создать админа на dev сервере

## Проблема

Пароль `admin123!` тоже не работает. Админ пользователь не существует или пароль другой в dev базе.

## ✅ Решение (3 минуты)

### Откройте терминал и выполните эти команды:

```bash
ssh root@91.210.106.218
```

**После подключения**, скопируйте и вставьте **ВСЁ СРАЗУ**:

```bash
cd /root/crm-backend-dev && \
echo "=== Применяем миграции ===" && \
npx prisma migrate deploy && \
echo "" && \
echo "=== Создаем админа с паролем admin123! ===" && \
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function resetAdmin() {
  try {
    // Удалить старого админа если есть
    await prisma.user.deleteMany({
      where: { email: 'admin@example.com' }
    });
    console.log('Старый админ удален (если был)');

    // Создать нового
    const hashedPassword = await bcrypt.hash('admin123!', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      }
    });

    console.log('');
    console.log('✅ Админ создан успешно!');
    console.log('Email: admin@example.com');
    console.log('Password: admin123!');
    console.log('');
  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

resetAdmin();
" && \
echo "" && \
echo "=== Перезапускаем backend ===" && \
pm2 restart crm-backend-dev && \
sleep 3 && \
echo "" && \
echo "=== Проверяем здоровье ===" && \
curl -s http://localhost:3001/api/health && \
echo "" && \
echo "" && \
echo "✅ ГОТОВО! Можете выйти (напишите: exit)"
```

Эта команда:
1. ✅ Применит все миграции (включая link field)
2. ✅ Удалит старого админа
3. ✅ Создаст нового с паролем `admin123!`
4. ✅ Перезапустит backend
5. ✅ Проверит что всё работает

### Затем выйдите:

```bash
exit
```

---

## 🧪 Проверка

После выполнения команд на сервере, вернитесь на локальную машину и запустите:

```bash
cd "/Users/kosta/Documents/VOYZ/CRM Development"
node test-with-correct-password.js
```

**Ожидаемый результат:**
```
✅ Login successful!
✅ Current user: Admin (admin@example.com)
✅ Tasks endpoint works!
✅ Deals endpoint works!
```

---

## 🚀 Запуск frontend

Если тест прошел успешно:

```bash
cd "/Users/kosta/Documents/VOYZ/CRM Development/CRM"
npm run dev
```

Откройте: http://localhost:5173

**Login:**
- Email: `admin@example.com`
- Password: `admin123!`

**Проверьте:**
- ✅ Tasks page (`/tasks`) открывается
- ✅ Список пользователей загружается
- ✅ Поиск работает
- ✅ Создание задачи обновляет список

---

## 🔧 Если команда не выполнилась полностью

### Вариант 1: По шагам

```bash
ssh root@91.210.106.218
```

После подключения:

```bash
cd /root/crm-backend-dev
```

```bash
npx prisma migrate deploy
```

```bash
npm run create:admin
# Если спросит email - введите: admin@example.com
# Если спросит пароль - введите: admin123!
```

Если `npm run create:admin` не работает, используйте скрипт:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAdmin() {
  await prisma.user.deleteMany({ where: { email: 'admin@example.com' } });
  const hashedPassword = await bcrypt.hash('admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN'
    }
  });
  console.log('Admin created:', admin.email);
  await prisma.\$disconnect();
}
resetAdmin().catch(console.error);
"
```

```bash
pm2 restart crm-backend-dev
```

```bash
exit
```

---

## 📋 Быстрый чеклист

- [ ] SSH подключился
- [ ] `npx prisma migrate deploy` успешно
- [ ] Админ создан
- [ ] `pm2 restart crm-backend-dev` успешно
- [ ] `node test-with-correct-password.js` - login ✅
- [ ] Frontend запускается
- [ ] Login работает
- [ ] Tasks page открывается
- [ ] Search работает

---

## 🆘 Если SSH не подключается

Попробуйте с паролем вместо ключа:

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@91.210.106.218
```

Введите пароль: `5nlT3rry_4`

Или добавьте ключ в ssh-agent:

```bash
ssh-add ~/.ssh/id_ed25519
# Введите passphrase
# Затем: ssh root@91.210.106.218
```

---

## 💡 Альтернатива: Через VSCode

1. Откройте VSCode
2. F1 → "Remote-SSH: Connect to Host"
3. Введите: `root@91.210.106.218`
4. Введите passphrase
5. Откройте терминал (Ctrl + `)
6. Выполните команды выше

---

После выполнения - пишите, проверим вместе!
