# Какой репозиторий использует Codespace?

## Текущая ситуация

### Локальная машина имеет два remote:

1. **`origin`** → `https://github.com/serdyukovsky/voyz-crm.git`
   - Старый репозиторий
   - Ветка `main` отслеживает `origin/main`
   - Локальная ветка опережает `origin/main` на 14 коммитов

2. **`pgbxxms8wg-max`** → `https://github.com/pgbxxms8wg-max/voyz-crm.git`
   - Новый репозиторий
   - Сюда мы пушим все изменения

## Как узнать, какой репозиторий использует Codespace?

### Вариант 1: Проверить в Codespace

```bash
# Подключитесь к Codespace
gh codespace ssh

# Проверьте remote
git remote -v

# Проверьте, какая ветка отслеживается
git branch -vv

# Проверьте URL репозитория
git config --get remote.origin.url
```

### Вариант 2: Проверить в GitHub UI

1. Откройте Codespace в браузере
2. Посмотрите в правом верхнем углу - там указан репозиторий
3. Или в настройках Codespace

### Вариант 3: Проверить при создании Codespace

- Codespace создается из конкретного репозитория
- При создании указывается репозиторий
- Обычно это репозиторий, из которого вы создали Codespace

## Возможные сценарии

### Сценарий 1: Codespace использует `serdyukovsky/voyz-crm`

**Проблема:**
- Codespace клонирует старый репозиторий
- Ваши изменения в `pgbxxms8wg-max/voyz-crm` не попадут в Codespace
- Нужно либо переключить remote, либо создать новый Codespace

**Решение:**
```bash
# В Codespace
git remote set-url origin https://github.com/pgbxxms8wg-max/voyz-crm.git
git fetch origin
git branch --set-upstream-to=origin/main main
git pull origin main
```

### Сценарий 2: Codespace использует `pgbxxms8wg-max/voyz-crm`

**Хорошо:**
- Codespace клонирует правильный репозиторий
- Просто нужно делать `git pull origin main`

**Проверка:**
```bash
# В Codespace
git remote -v
# Должно показать: pgbxxms8wg-max/voyz-crm.git
```

## Рекомендации

### 1. Унифицировать remote

**На локальной машине:**
```bash
# Установить origin на новый репозиторий
git remote set-url origin https://github.com/pgbxxms8wg-max/voyz-crm.git

# Или удалить старый и добавить новый
git remote remove origin
git remote add origin https://github.com/pgbxxms8wg-max/voyz-crm.git
```

**В Codespace:**
```bash
# Проверить текущий remote
git remote -v

# Если нужно, изменить на правильный
git remote set-url origin https://github.com/pgbxxms8wg-max/voyz-crm.git
```

### 2. Создать новый Codespace из правильного репозитория

Если Codespace использует старый репозиторий:
1. Создайте новый Codespace из `pgbxxms8wg-max/voyz-crm`
2. Удалите старый Codespace (если не нужен)

## Как проверить сейчас

Выполните в Codespace:

```bash
git remote -v
git config --get remote.origin.url
git branch -vv
```

Это покажет:
- Какой репозиторий используется
- Какая ветка отслеживается
- Есть ли отставание от удаленной ветки

