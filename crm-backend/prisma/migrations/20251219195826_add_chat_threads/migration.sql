-- DropIndex
DROP INDEX IF EXISTS "companies_phone_idx";

-- DropIndex
DROP INDEX IF EXISTS "tasks_createdAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "tasks_createdById_idx";

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "threadId" TEXT;

-- CreateTable
CREATE TABLE "chat_threads" (
    "id" TEXT NOT NULL,
    "dealId" TEXT,
    "taskId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_thread_participants" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_thread_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_threads_dealId_idx" ON "chat_threads"("dealId");

-- CreateIndex
CREATE INDEX "chat_threads_taskId_idx" ON "chat_threads"("taskId");

-- CreateIndex
CREATE INDEX "chat_thread_participants_threadId_idx" ON "chat_thread_participants"("threadId");

-- CreateIndex
CREATE INDEX "chat_thread_participants_userId_idx" ON "chat_thread_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "chat_thread_participants_threadId_userId_key" ON "chat_thread_participants"("threadId", "userId");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread_participants" ADD CONSTRAINT "chat_thread_participants_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "chat_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread_participants" ADD CONSTRAINT "chat_thread_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
