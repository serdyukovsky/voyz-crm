import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 Проверка примененных изменений...\n');

  // Проверка unique constraints и индексов
  const indexes = await prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (
        indexname LIKE '%email%' OR
        indexname LIKE '%phone%' OR
        indexname LIKE '%name%' OR
        indexname LIKE '%companyId%' OR
        indexname LIKE '%updatedAt%' OR
        indexname LIKE '%pipelineId_stageId%' OR
        indexname LIKE '%createdById%' OR
        indexname LIKE '%createdAt%' OR
        indexname LIKE '%dealId_createdAt%'
      )
    ORDER BY tablename, indexname
  `;

  const expectedIndexes = [
    'contacts_email_key',
    'contacts_phone_key',
    'companies_name_key',
    'companies_email_key',
    'companies_phone_idx',
    'deals_companyId_idx',
    'deals_updatedAt_idx',
    'deals_pipelineId_stageId_idx',
    'tasks_createdById_idx',
    'tasks_createdAt_idx',
    'activities_dealId_createdAt_idx',
  ];

  console.log('📋 Найденные индексы:');
  const foundIndexes = indexes.map(i => i.indexname);
  expectedIndexes.forEach(expected => {
    if (foundIndexes.includes(expected)) {
      console.log(`  ✅ ${expected}`);
    } else {
      console.log(`  ❌ ${expected} - НЕ НАЙДЕН`);
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const missing = expectedIndexes.filter(e => !foundIndexes.includes(e));
  if (missing.length === 0) {
    console.log('✅ ВСЕ ИНДЕКСЫ И CONSTRAINTS ПРИМЕНЕНЫ!');
  } else {
    console.log(`⚠️  Отсутствуют: ${missing.join(', ')}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verifyMigration()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

