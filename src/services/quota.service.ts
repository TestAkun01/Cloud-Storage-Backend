import { prisma } from "../db";
import { CustomError } from "../errors/custom.error";

export const QuotaService = {
  /**
   * Get user quota information.
   */
  async getUserQuota(userId: string) {
    const userQuota = await prisma.userQuota.findUnique({
      where: { userId },
    });

    if (!userQuota) {
      throw new CustomError(
        "Quota not found for this user",
        "QUOTA_NOT_FOUND",
        404
      );
    }

    return {
      storageLimit: userQuota.storageLimit,
      storageUsed: userQuota.storageUsed,
      remainingStorage: userQuota.storageLimit - userQuota.storageUsed,
    };
  },

  /**
   * Update or create user quota.
   */
  async updateUserQuota(userId: string, storageLimit: bigint) {
    const updatedQuota = await prisma.userQuota.upsert({
      where: { userId },
      update: { storageLimit },
      create: {
        userId,
        storageLimit,
        storageUsed: 0n, // Default to 0 bytes used
      },
    });

    return updatedQuota;
  },
};
