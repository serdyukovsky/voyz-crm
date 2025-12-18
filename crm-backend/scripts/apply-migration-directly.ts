import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🚀 Применение миграции prepare_import...\n');

  const migrations = [
    // Unique constraints
    `CREATE UNIQUE INDEX IF NOT EXISTS "contacts_email_key" ON "contacts"("email") WHERE "email" IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "contacts_phone_key" ON "contacts"("phone") WHERE "phone" IS NOT NULL`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "companies_name_key" ON "companies"("name")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "companies_email_key" ON "companies"("email") WHERE "email" IS NOT NULL`,
    
    // Indexes
    `CREATE INDEX IF NOT EXISTS "companies_phone_idx" ON "companies"("phone")`,
    `CREATE INDEX IF NOT EXISTS "deals_companyId_idx" ON "deals"("companyId")`,
    `CREATE INDEX IF NOT EXISTS "deals_updatedAt_idx" ON "deals"("updatedAt")`,
    `CREATE INDEX IF NOT EXISTS "deals_pipelineId_stageId_idx" ON "deals"("pipelineId", "stageId")`,
    `CREATE INDEX IF NOT EXISTS "tasks_createdById_idx" ON "tasks"("createdById")`,
    `CREATE INDEX IF NOT EXISTS "tasks_createdAt_idx" ON "tasks"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "activities_dealId_createdAt_idx" ON "activities"("dealId", "createdAt")`,
  ];

  for (const sql of migrations) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`✅ ${sql.substring(0, 60)}...`);
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        console.log(`⚠️  Уже существует: ${sql.substring(0, 60)}...`);
      } else {
        console.error(`❌ Ошибка: ${sql.substring(0, 60)}...`);
        console.error(`   ${error.message}`);
      }
    }
  }

  console.log('\n✅ Миграция применена!');
}

applyMigration()
  .catch((e) => {
    console.error('❌ Ошибка:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

