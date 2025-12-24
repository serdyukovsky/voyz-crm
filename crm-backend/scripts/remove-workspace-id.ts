import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if column exists and remove it
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
          IF EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'pipelines' 
              AND column_name = 'workspaceId'
          ) THEN
              ALTER TABLE pipelines DROP COLUMN "workspaceId";
              RAISE NOTICE 'Column workspaceId removed from pipelines table';
          ELSE
              RAISE NOTICE 'Column workspaceId does not exist in pipelines table';
          END IF;
      END $$;
    `);
    console.log('✅ Successfully checked/removed workspaceId column');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

