-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "contactMethods" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "directions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "link" TEXT,
ADD COLUMN     "subscriberCount" TEXT,
ADD COLUMN     "websiteOrTgChannel" TEXT;

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "rejectionReasons" TEXT[] DEFAULT ARRAY[]::TEXT[];
