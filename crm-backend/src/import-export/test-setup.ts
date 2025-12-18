/**
 * Test Setup для Integration тестов
 * 
 * Настройка тестовой БД для Prisma
 */

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export async function setupTestDb() {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  });

  await prisma.$connect();

  // Очистка всех таблиц перед тестами
  await cleanupDatabase(prisma);

  return prisma;
}

export async function cleanupDatabase(prisma: PrismaClient) {
  // Удаляем в правильном порядке (сначала зависимые таблицы)
  await prisma.activity.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.task.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.file.deleteMany();
  await prisma.customFieldValue.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.stage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.internalMessage.deleteMany();
  await prisma.chatThreadParticipant.deleteMany();
  await prisma.chatThread.deleteMany();
  await prisma.message.deleteMany();
  await prisma.call.deleteMany();
  await prisma.log.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.exportJob.deleteMany();
  await prisma.userPermission.deleteMany();
  await prisma.refreshToken.deleteMany();
  // User удаляем в последнюю очередь
  await prisma.user.deleteMany();
}

export async function teardownTestDb() {
  if (prisma) {
    await cleanupDatabase(prisma);
    await prisma.$disconnect();
  }
}

