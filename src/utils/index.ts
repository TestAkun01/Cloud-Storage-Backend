import { Prisma, prisma } from "../lib/prisma";

export const checkWritePermission = async (
  folderId: string,
  userId: string
) => {
  let currentFolderId: string | null = folderId;

  while (currentFolderId) {
    const sharedFolder = await prisma.share.findFirst({
      where: {
        folderId: currentFolderId,
        userId,
        permission: "WRITE",
      },
    });

    if (sharedFolder) {
      return true;
    }
    const parentFolder: { parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentFolderId },
        select: { parentId: true },
      });

    if (!parentFolder) {
      break;
    }

    currentFolderId = parentFolder?.parentId || null;
  }

  return false;
};
