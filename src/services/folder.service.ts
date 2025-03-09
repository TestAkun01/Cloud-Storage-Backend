import { CustomError } from "../errors/custom.error";
import { prisma } from "../lib/prisma";

export const createFolder = async (
  userId: string,
  name: string,
  parentId?: string
) => {
  if (parentId) {
    const parentFolder = await prisma.folder.findUnique({
      where: { id: parentId, userId },
    });
    if (!parentFolder) {
      throw new CustomError("Parent folder not found", "PARENT_NOT_FOUND", 404);
    }
  }

  return prisma.folder.create({
    data: { name, userId, parentId },
  });
};

export const listFolders = async (userId: string) => {
  return prisma.folder.findMany({ where: { userId, trashed: false } });
};

export const getFolderContents = async (userId: string, folderId: string) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId, userId },
  });
  if (!folder) {
    throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
  }

  const files = await prisma.file.findMany({
    where: { folderId, userId, trashed: false },
  });
  const subFolders = await prisma.folder.findMany({
    where: { parentId: folderId, userId, trashed: false },
  });

  return { folder, files, subFolders };
};

export const renameFolder = async (
  userId: string,
  folderId: string,
  newName: string
) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId, userId },
  });
  if (!folder) {
    throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
  }

  return prisma.folder.update({
    where: { id: folderId },
    data: { name: newName },
  });
};

export const deleteFolder = async (userId: string, folderId: string) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId, userId },
  });
  if (!folder) {
    throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
  }

  return prisma.folder.update({
    where: { id: folderId },
    data: { trashed: true },
  });
};

export const restoreFolder = async (folderId: string, userId: string) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId, userId },
  });

  if (!folder) {
    throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
  }

  if (!folder.trashed) {
    throw new CustomError("Folder is not in trash", "FOLDER_NOT_IN_TRASH", 400);
  }

  await prisma.folder.update({
    where: { id: folderId },
    data: { trashed: false },
  });
};
