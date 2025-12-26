-- CreateTable
CREATE TABLE "system_field_options" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_field_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_field_options_entityType_fieldName_key" ON "system_field_options"("entityType", "fieldName");

-- CreateIndex
CREATE INDEX "system_field_options_entityType_fieldName_idx" ON "system_field_options"("entityType", "fieldName");

