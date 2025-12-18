import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Проверка дубликатов...\n');

  // Contacts: Дубликаты по email
  console.log('📧 Contacts - дубликаты по email:');
  const emailDuplicates = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
    SELECT email, COUNT(*) as count
    FROM contacts 
    WHERE email IS NOT NULL 
    GROUP BY email 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;
  
  if (emailDuplicates.length === 0) {
    console.log('  ✅ Дубликатов не найдено\n');
  } else {
    console.log(`  ⚠️  Найдено ${emailDuplicates.length} дубликатов:`);
    emailDuplicates.forEach((d) => {
      console.log(`     ${d.email}: ${d.count} записей`);
    });
    console.log('');
  }

  // Contacts: Дубликаты по phone
  console.log('📱 Contacts - дубликаты по phone:');
  const phoneDuplicates = await prisma.$queryRaw<Array<{ phone: string; count: bigint }>>`
    SELECT phone, COUNT(*) as count
    FROM contacts 
    WHERE phone IS NOT NULL 
    GROUP BY phone 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;
  
  if (phoneDuplicates.length === 0) {
    console.log('  ✅ Дубликатов не найдено\n');
  } else {
    console.log(`  ⚠️  Найдено ${phoneDuplicates.length} дубликатов:`);
    phoneDuplicates.forEach((d) => {
      console.log(`     ${d.phone}: ${d.count} записей`);
    });
    console.log('');
  }

  // Companies: Дубликаты по name
  console.log('🏢 Companies - дубликаты по name:');
  const nameDuplicates = await prisma.$queryRaw<Array<{ name: string; count: bigint }>>`
    SELECT name, COUNT(*) as count
    FROM companies 
    GROUP BY name 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;
  
  if (nameDuplicates.length === 0) {
    console.log('  ✅ Дубликатов не найдено\n');
  } else {
    console.log(`  ⚠️  Найдено ${nameDuplicates.length} дубликатов:`);
    nameDuplicates.forEach((d) => {
      console.log(`     ${d.name}: ${d.count} записей`);
    });
    console.log('');
  }

  // Companies: Дубликаты по email
  console.log('📧 Companies - дубликаты по email:');
  const companyEmailDuplicates = await prisma.$queryRaw<Array<{ email: string; count: bigint }>>`
    SELECT email, COUNT(*) as count
    FROM companies 
    WHERE email IS NOT NULL 
    GROUP BY email 
    HAVING COUNT(*) > 1
    ORDER BY count DESC
  `;
  
  if (companyEmailDuplicates.length === 0) {
    console.log('  ✅ Дубликатов не найдено\n');
  } else {
    console.log(`  ⚠️  Найдено ${companyEmailDuplicates.length} дубликатов:`);
    companyEmailDuplicates.forEach((d) => {
      console.log(`     ${d.email}: ${d.count} записей`);
    });
    console.log('');
  }

  // Итог
  const totalDuplicates = 
    emailDuplicates.length + 
    phoneDuplicates.length + 
    nameDuplicates.length + 
    companyEmailDuplicates.length;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (totalDuplicates === 0) {
    console.log('✅ ДУБЛИКАТОВ НЕ НАЙДЕНО - можно применять миграцию!');
  } else {
    console.log(`⚠️  НАЙДЕНО ${totalDuplicates} ГРУПП ДУБЛИКАТОВ`);
    console.log('   Нужно очистить дубликаты перед миграцией.');
    console.log('   См. scripts/fix-duplicates.sql');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkDuplicates()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

