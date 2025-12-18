-- ============================================
-- ПРОВЕРКА ДУБЛИКАТОВ ПЕРЕД МИГРАЦИЕЙ
-- ============================================

-- Contacts: Дубликаты по email
SELECT email, COUNT(*) as count
FROM contacts 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Contacts: Дубликаты по phone
SELECT phone, COUNT(*) as count
FROM contacts 
WHERE phone IS NOT NULL 
GROUP BY phone 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Companies: Дубликаты по name
SELECT name, COUNT(*) as count
FROM companies 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Companies: Дубликаты по email
SELECT email, COUNT(*) as count
FROM companies 
WHERE email IS NOT NULL 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY count DESC;

