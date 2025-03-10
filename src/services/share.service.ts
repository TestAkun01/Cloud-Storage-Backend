import { prisma } from "../lib/prisma";
import { CustomError } from "../errors/custom.error";

export const shareItem = async (
  ownerId: string,
  targetUserId: string,
  itemId: string,
  type: "file" | "folder",
  permission: "READ" | "WRITE"
) => {
  const item =
    type === "file"
      ? await prisma.file.findUnique({ where: { id: itemId, userId: ownerId } })
      : await prisma.folder.findUnique({
          where: { id: itemId, userId: ownerId },
        });

  if (!item) {
    throw new CustomError(`${type} not found`, "ITEM_NOT_FOUND", 404);
  }

  const existingShare = await prisma.share.findFirst({
    where: {
      [`${type}Id`]: itemId,
      userId: targetUserId,
    },
  });

  if (existingShare) {
    throw new CustomError(`${type} already shared`, "ALREADY_SHARED", 400);
  }

  return await prisma.share.create({
    data: {
      [`${type}Id`]: itemId,
      userId: targetUserId,
      permission,
    },
  });
};

export const listSharedItems = async (userId: string) => {
  const sharedFiles = await prisma.share.findMany({
    where: { userId, fileId: { not: null } },
    include: { file: true },
  });

  const sharedFolders = await prisma.share.findMany({
    where: { userId, folderId: { not: null } },
    include: { folder: true },
  });

  return { sharedFiles, sharedFolders };
};

export const revokeShare = async (ownerId: string, shareId: string) => {
  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: { file: true, folder: true },
  });

  if (
    !share ||
    (share.file && share.file.userId !== ownerId) ||
    (share.folder && share.folder.userId !== ownerId)
  ) {
    throw new CustomError(
      "Unauthorized or share not found",
      "UNAUTHORIZED",
      403
    );
  }

  await prisma.share.delete({ where: { id: shareId } });
  return { success: true, message: "Share revoked successfully" };
};
