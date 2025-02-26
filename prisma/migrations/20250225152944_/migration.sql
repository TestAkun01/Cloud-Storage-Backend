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
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "metadata" JSONB,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Object_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ObjectToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ObjectToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Object_objectId_key" ON "Object"("objectId");

-- CreateIndex
CREATE UNIQUE INDEX "Object_path_key" ON "Object"("path");

-- CreateIndex
CREATE INDEX "_ObjectToTag_B_index" ON "_ObjectToTag"("B");

-- AddForeignKey
ALTER TABLE "Object" ADD CONSTRAINT "Object_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ObjectToTag" ADD CONSTRAINT "_ObjectToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Object"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ObjectToTag" ADD CONSTRAINT "_ObjectToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
