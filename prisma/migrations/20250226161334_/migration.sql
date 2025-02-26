-- CreateTable
CREATE TABLE "presigned_urls" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "presigned_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presigned_urls_objectId_idx" ON "presigned_urls"("objectId");

-- AddForeignKey
ALTER TABLE "presigned_urls" ADD CONSTRAINT "presigned_urls_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "storage_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
