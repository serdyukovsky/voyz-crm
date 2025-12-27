# Анализ условий активации кнопки "Создать сотрудника"

## Обзор

Кнопка создания сотрудника имеет два уровня проверок:
1. **Уровень доступа** - отображение кнопки на странице
2. **Уровень валидации формы** - активация кнопки в модальном окне

---

## 1. Уровень доступа (Отображение кнопки на странице)

### Файл: `CRM/src/pages/UsersPage.tsx`

**Код:**
```tsx
{canManageUsers && (
  <Button size="sm" onClick={() => setIsCreateUserModalOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    {t('users.addUser')}
  </Button>
)}
```

**Условие:** `canManageUsers === true`

### Определение `canManageUsers`

**Файл:** `CRM/hooks/use-user-role.ts`

```typescript
const canManageUsers = isAdmin // Only admin can manage users
```

Где `isAdmin` определяется как:
```typescript
const isAdmin = currentRole === 'ADMIN'
```

**Роль берется из:**
- localStorage: `localStorage.getItem('user')` → `user.role`
- Или передается через параметры хука

### ✅ Условие активации на уровне страницы:
- **Текущий пользователь должен иметь роль `ADMIN`**
- Роль должна быть сохранена в `localStorage` под ключом `'user'` в формате JSON

---

## 2. Уровень валидации формы (Активация кнопки в модальном окне)

### Файл: `CRM/components/crm/create-user-modal.tsx`

**Кнопка:**
```tsx
<Button 
  size="icon" 
  className="h-10 w-10 rounded-full" 
  onClick={handleSave}
  disabled={loading || !isFormValid}
  title={t('users.createUser') || 'Создать пользователя'}
>
  <Check className="h-5 w-5" strokeWidth={3} />
</Button>
```

**Условие активации:** `loading === false && isFormValid === true`

---

## 3. Детальная валидация формы (`isFormValid`)

### Файл: `CRM/components/crm/create-user-modal.tsx` (строки 166-177)

```typescript
const isFormValid = useMemo(() => {
  // Check all required fields
  if (!firstName.trim()) return false
  if (!lastName.trim()) return false
  if (!email.trim() || validateEmail(email) !== null) return false
  if (!password || validatePassword(password).length > 0) return false
  if (!confirmPassword.trim() || password !== confirmPassword) return false
  // Phone validation - check if phone is valid
  const phoneError = validatePhone(phone)
  if (phoneError) return false
  return true
}, [firstName, lastName, email, password, confirmPassword, phone, t])
```

---

## 4. Детальные требования к полям

### 4.1. Имя (firstName)
- **Требование:** Не должно быть пустым после `trim()`
- **Проверка:** `firstName.trim() !== ''`

### 4.2. Фамилия (lastName)
- **Требование:** Не должна быть пустой после `trim()`
- **Проверка:** `lastName.trim() !== ''`

### 4.3. Email
- **Требование:** 
  - Не должен быть пустым после `trim()`
  - Должен соответствовать формату email
- **Валидация:** `validateEmail(email)`
  ```typescript
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'Email обязателен'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Некорректный формат email'
    }
    return null
  }
  ```
- **Проверка:** `email.trim() !== '' && validateEmail(email) === null`

### 4.4. Пароль (password)
- **Требования:**
  1. Не должен быть пустым
  2. Минимум 6 символов
  3. Хотя бы одна буква (латиница)
  4. Хотя бы одна цифра
- **Валидация:** `validatePassword(password)`
  ```typescript
  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (!password) {
      return ['Пароль обязателен']
    }
    if (password.length < 6) {
      errors.push('Минимум 6 символов')
    }
    if (!/[A-Za-z]/.test(password)) {
      errors.push('Хотя бы одна буква')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Хотя бы одна цифра')
    }
    return errors
  }
  ```
- **Проверка:** `password !== '' && validatePassword(password).length === 0`

### 4.5. Подтверждение пароля (confirmPassword)
- **Требования:**
  - Не должно быть пустым после `trim()`
  - Должно совпадать с полем `password`
- **Проверка:** `confirmPassword.trim() !== '' && password === confirmPassword`

### 4.6. Телефон (phone)
- **Требования:**
  - Не должен быть пустым
  - Должен содержать ровно 11 цифр (после удаления всех нецифровых символов)
- **Форматирование:** Автоматическое форматирование в формат `+7 (XXX) XXX-XX-XX`
  - Конвертация `8` в `7` в начале номера
  - Автоматическое добавление `+7` если номер не начинается с 7 или 8
- **Валидация:** `validatePhone(phone)`
  ```typescript
  const validatePhone = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length === 0) {
      return 'Номер телефона обязателен'
    }
    if (digits.length < 11) {
      return 'Номер телефона должен содержать 11 цифр'
    }
    return null
  }
  ```
- **Проверка:** `validatePhone(phone) === null`

### 4.7. Telegram Username (telegramUsername)
- **Статус:** Опциональное поле
- **Не влияет на активацию кнопки**

### 4.8. Роль (role)
- **Статус:** Опциональное поле (по умолчанию `'MANAGER'`)
- **Не влияет на активацию кнопки**

### 4.9. Активность (isActive)
- **Статус:** Опциональное поле (по умолчанию `true`)
- **Не влияет на активацию кнопки**

---

## 5. Дополнительные условия

### 5.1. Состояние загрузки (`loading`)
- Кнопка **отключена**, если `loading === true`
- `loading` устанавливается в `true` при вызове `handleSave()`
- Сбрасывается в `false` после завершения операции (успех или ошибка)

### 5.2. Реактивность валидации
- Валидация происходит в реальном времени через `useMemo`
- Зависимости: `[firstName, lastName, email, password, confirmPassword, phone, t]`
- Кнопка автоматически активируется/деактивируется при изменении полей

---

## 6. Итоговая таблица условий

| Условие | Требование | Проверка |
|---------|-----------|----------|
| **Доступ** | Роль пользователя | `currentRole === 'ADMIN'` |
| **Имя** | Не пустое | `firstName.trim() !== ''` |
| **Фамилия** | Не пустая | `lastName.trim() !== ''` |
| **Email** | Валидный формат | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)` |
| **Пароль** | ≥6 символов, буква, цифра | `password.length >= 6 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)` |
| **Подтверждение** | Совпадает с паролем | `password === confirmPassword` |
| **Телефон** | 11 цифр | `phone.replace(/\D/g, '').length === 11` |
| **Загрузка** | Не в процессе | `loading === false` |

---

## 7. Примеры валидных данных

### ✅ Валидная форма:
```
firstName: "Иван"
lastName: "Петров"
email: "ivan@example.com"
password: "Password123"
confirmPassword: "Password123"
phone: "+7 (999) 123-45-67"  // или "89991234567", "79991234567"
```

### ❌ Невалидные примеры:

1. **Пустое имя:**
   ```
   firstName: ""  // или только пробелы
   ```

2. **Невалидный email:**
   ```
   email: "invalid-email"  // нет @ и домена
   email: "test@"  // нет домена
   ```

3. **Слабый пароль:**
   ```
   password: "12345"  // меньше 6 символов
   password: "password"  // нет цифр
   password: "123456"  // нет букв
   ```

4. **Несовпадающие пароли:**
   ```
   password: "Password123"
   confirmPassword: "Password456"
   ```

5. **Неполный телефон:**
   ```
   phone: "+7 (999) 123"  // меньше 11 цифр
   phone: ""  // пустой
   ```

---

## 8. Последовательность проверок при создании

1. **Проверка доступа** (на странице):
   - Пользователь должен быть ADMIN
   - Если нет → кнопка не отображается

2. **Открытие модального окна**:
   - Форма сбрасывается в начальное состояние
   - Все поля пустые
   - Кнопка неактивна

3. **Заполнение формы**:
   - Валидация в реальном времени
   - Кнопка активируется только когда все поля валидны

4. **Нажатие кнопки**:
   - Проверка `loading === false`
   - Проверка `isFormValid === true`
   - Если обе проверки пройдены → вызов `handleSave()`

5. **Дополнительная валидация в `handleSave()`**:
   - Повторная проверка всех полей
   - Если есть ошибки → отображение ошибок, остановка
   - Если все валидно → отправка на сервер

---

## 9. Код валидации на бэкенде

**Файл:** `crm-backend/src/users/dto/create-user.dto.ts`

Бэкенд также валидирует данные:
- `@IsEmailNormalized()` - нормализованный email
- `@IsString()` - строковые поля
- `@MinLength(6)` - минимальная длина пароля
- Проверка на существование пользователя с таким email

**Важно:** Валидация на фронтенде и бэкенде может отличаться. Фронтенд более строгий (требует телефон), бэкенд делает телефон опциональным.

---

## 10. Резюме

Кнопка "Создать сотрудника" становится активной при выполнении **ВСЕХ** условий:

1. ✅ Пользователь имеет роль `ADMIN`
2. ✅ Поле "Имя" заполнено
3. ✅ Поле "Фамилия" заполнено
4. ✅ Email валидный (формат `user@domain.com`)
5. ✅ Пароль соответствует требованиям (≥6 символов, буква, цифра)
6. ✅ Подтверждение пароля совпадает с паролем
7. ✅ Телефон содержит 11 цифр
8. ✅ Не идет процесс сохранения (`loading === false`)

**Все условия должны выполняться одновременно!**


