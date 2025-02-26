/*
  Warnings:

  - A unique constraint covering the columns `[userId,objectId]` on the table `Object` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Object_userId_objectId_key" ON "Object"("userId", "objectId");
