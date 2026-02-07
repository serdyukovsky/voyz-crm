-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- AlterTable: Add type column with default OPEN
ALTER TABLE "stages" ADD COLUMN "type" "StageType" NOT NULL DEFAULT 'OPEN';

-- Migrate data: set type based on isClosed flag and stage name patterns
-- WON stages: isClosed=true AND name contains "won" or "выигр" (Russian for "won")
UPDATE "stages" SET "type" = 'WON'
WHERE "isClosed" = true
  AND (
    LOWER("name") LIKE '%won%'
    OR LOWER("name") LIKE '%выигр%'
    OR LOWER("name") LIKE '%успеш%'
  );

-- LOST stages: isClosed=true AND name contains "lost" or "проигр" (Russian for "lost")
UPDATE "stages" SET "type" = 'LOST'
WHERE "isClosed" = true
  AND (
    LOWER("name") LIKE '%lost%'
    OR LOWER("name") LIKE '%проигр%'
    OR LOWER("name") LIKE '%отказ%'
    OR LOWER("name") LIKE '%отклон%'
  );

-- Remaining isClosed=true stages that didn't match any pattern: default to LOST
UPDATE "stages" SET "type" = 'LOST'
WHERE "isClosed" = true AND "type" = 'OPEN';

-- DropColumn: Remove isClosed (no longer needed)
ALTER TABLE "stages" DROP COLUMN "isClosed";
