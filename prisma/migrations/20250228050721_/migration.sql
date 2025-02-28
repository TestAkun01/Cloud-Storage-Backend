-- AlterTable
ALTER TABLE "storage_objects" ADD COLUMN     "isFolder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "previousVersionId" TEXT;

-- CreateTable
CREATE TABLE "shared_files" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedWithUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectId" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_files_objectId_sharedWithUserId_idx" ON "shared_files"("objectId", "sharedWithUserId");

-- CreateIndex
CREATE INDEX "activity_logs_userId_objectId_idx" ON "activity_logs"("userId", "objectId");

-- AddForeignKey
ALTER TABLE "storage_objects" ADD CONSTRAINT "storage_objects_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "storage_objects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "storage_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_sharedWithUserId_fkey" FOREIGN KEY ("sharedWithUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "storage_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
