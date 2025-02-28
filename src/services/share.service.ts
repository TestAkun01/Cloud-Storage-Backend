import { prisma } from "../db";
import { config } from "../config";
import { CustomError } from "../errors/custom.error";

export const ShareService = {
  /**
   * Share a file with another user.
   */
  async shareFileWithUser(
    userId: string,
    objectId: string,
    sharedWithUserId: string
  ) {
    const sharedFile = await prisma.sharedFile.create({
      data: {
        objectId,
        userId,
        sharedWithUserId,
      },
    });

    return sharedFile;
  },

  /**
   * Generate a public access link for a file.
   */
  async generatePublicLink(objectId: string, expiresInSeconds: number) {
    const accessLink = await prisma.accessLink.create({
      data: {
        objectId,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });

    return {
      link: `${config.API_URL}/access/${accessLink.id}`,
      expiresAt: accessLink.expiresAt,
    };
  },

  /**
   * Revoke access by deleting an access link.
   */
  async revokeAccess(accessLinkId: string) {
    await prisma.accessLink.delete({
      where: { id: accessLinkId },
    });

    return { success: true };
  },
};
