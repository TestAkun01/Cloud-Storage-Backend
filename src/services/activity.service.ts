import { prisma } from "../db";
import { CustomError } from "../errors/custom.error";

export const ActivityService = {
  /**
   * Fetch user activity logs.
   */
  async fetchUserActivity(userId: string) {
    const activities = await prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return activities;
  },

  /**
   * Fetch file access logs.
   */
  async fetchFileAccessLogs(objectId: string) {
    const accessLogs = await prisma.activityLog.findMany({
      where: { objectId },
      orderBy: { createdAt: "desc" },
    });

    return accessLogs;
  },
};
