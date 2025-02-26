/*
  Warnings:

  - You are about to drop the `File` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_FileToTag` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_userId_fkey";

-- DropForeignKey
ALTER TABLE "_FileToTag" DROP CONSTRAINT "_FileToTag_A_fkey";

-- DropForeignKey
ALTER TABLE "_FileToTag" DROP CONSTRAINT "_FileToTag_B_fkey";

-- DropTable
DROP TABLE "File";

-- DropTable
DROP TABLE "_FileToTag";

-- CreateTable
CREATE TABLE "Object" (
    "objectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("userId","prefix","name")
);

-- CreateTable
CREATE TABLE "ObjectTag" (
    "objectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "ObjectTag_pkey" PRIMARY KEY ("objectId","tagId")
);

-- CreateIndex
CREATE INDEX "Object_userId_prefix_idx" ON "Object"("userId", "prefix");

-- CreateIndex
CREATE INDEX "Object_userId_objectId_idx" ON "Object"("userId", "objectId");

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectTag" ADD CONSTRAINT "ObjectTag_userId_prefix_name_fkey" FOREIGN KEY ("userId", "prefix", "name") REFERENCES "Object"("userId", "prefix", "name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectTag" ADD CONSTRAINT "ObjectTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
