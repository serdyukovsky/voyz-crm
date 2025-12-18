-- ============================================
-- СКРИПТ ДЛЯ ОЧИСТКИ ДУБЛИКАТОВ
-- ВНИМАНИЕ: Выполнять только после проверки!
-- ============================================

-- ============================================
-- 1. CONTACTS: Очистка дубликатов по email
-- ============================================
-- Стратегия: Оставляем самый старый контакт, остальные помечаем для удаления/обновления

-- Сначала посмотрим, какие контакты будут удалены
WITH duplicates AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) as rn
  FROM contacts
  WHERE email IS NOT NULL
)
SELECT 
  d.id,
  d.email,
  d.rn,
  c."fullName",
  c."createdAt"
FROM duplicates d
JOIN contacts c ON c.id = d.id
WHERE d.rn > 1
ORDER BY d.email, d.rn;

-- Если нужно удалить дубликаты (оставить только первый):
-- ВНИМАНИЕ: Это удалит данные! Сначала сделайте backup!
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) as rn
  FROM contacts
  WHERE email IS NOT NULL
)
DELETE FROM contacts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- Альтернатива: Обновить email дубликатов (добавить суффикс)
-- Это безопаснее, чем удаление
/*
WITH duplicates AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) as rn
  FROM contacts
  WHERE email IS NOT NULL
)
UPDATE contacts
SET email = email || '_duplicate_' || (rn - 1)
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- ============================================
-- 2. CONTACTS: Очистка дубликатов по phone
-- ============================================

-- Просмотр дубликатов
WITH duplicates AS (
  SELECT 
    id,
    phone,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" ASC) as rn
  FROM contacts
  WHERE phone IS NOT NULL
)
SELECT 
  d.id,
  d.phone,
  d.rn,
  c."fullName",
  c."createdAt"
FROM duplicates d
JOIN contacts c ON c.id = d.id
WHERE d.rn > 1
ORDER BY d.phone, d.rn;

-- Удаление дубликатов (раскомментировать при необходимости)
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY phone ORDER BY "createdAt" ASC) as rn
  FROM contacts
  WHERE phone IS NOT NULL
)
DELETE FROM contacts
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- ============================================
-- 3. COMPANIES: Очистка дубликатов по name
-- ============================================

-- Просмотр дубликатов
WITH duplicates AS (
  SELECT 
    id,
    name,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC) as rn
  FROM companies
)
SELECT 
  d.id,
  d.name,
  d.rn,
  c."createdAt",
  (SELECT COUNT(*) FROM deals WHERE "companyId" = d.id) as deals_count,
  (SELECT COUNT(*) FROM contacts WHERE "companyId" = d.id) as contacts_count
FROM duplicates d
JOIN companies c ON c.id = d.id
WHERE d.rn > 1
ORDER BY d.name, d.rn;

-- ВНИМАНИЕ: Для компаний лучше вручную проверить и объединить,
-- так как могут быть связанные deals и contacts!

-- Если нужно удалить (только если нет связанных данных):
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt" ASC) as rn
  FROM companies
  WHERE id NOT IN (
    SELECT DISTINCT "companyId" FROM deals WHERE "companyId" IS NOT NULL
    UNION
    SELECT DISTINCT "companyId" FROM contacts WHERE "companyId" IS NOT NULL
  )
)
DELETE FROM companies
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- ============================================
-- 4. COMPANIES: Очистка дубликатов по email
-- ============================================

-- Просмотр дубликатов
WITH duplicates AS (
  SELECT 
    id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) as rn
  FROM companies
  WHERE email IS NOT NULL
)
SELECT 
  d.id,
  d.email,
  d.rn,
  c.name,
  c."createdAt"
FROM duplicates d
JOIN companies c ON c.id = d.id
WHERE d.rn > 1
ORDER BY d.email, d.rn;

-- Удаление дубликатов (раскомментировать при необходимости)
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY "createdAt" ASC) as rn
  FROM companies
  WHERE email IS NOT NULL
)
DELETE FROM companies
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

