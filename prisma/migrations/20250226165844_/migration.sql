/*
  Warnings:

  - You are about to drop the `presigned_urls` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "presigned_urls" DROP CONSTRAINT "presigned_urls_objectId_fkey";

-- DropTable
DROP TABLE "presigned_urls";

-- CreateTable
CREATE TABLE "access_links" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_links_objectId_idx" ON "access_links"("objectId");

-- AddForeignKey
ALTER TABLE "access_links" ADD CONSTRAINT "access_links_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "storage_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
