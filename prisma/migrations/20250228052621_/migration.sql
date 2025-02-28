-- CreateTable
CREATE TABLE "user_quotas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storageLimit" BIGINT NOT NULL,
    "storageUsed" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_quotas_userId_key" ON "user_quotas"("userId");

-- AddForeignKey
ALTER TABLE "user_quotas" ADD CONSTRAINT "user_quotas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
