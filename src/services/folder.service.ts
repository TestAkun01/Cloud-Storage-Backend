import { prisma } from "../db";
import { config } from "../config";
import { CustomError } from "../errors/custom.error";

export const FolderService = {
  /**
   * Create a new folder.
   */
  async createFolder(userId: string, folderName: string, prefix: string = "/") {
    const normalizedPrefix =
      prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;
    const folderPath = `${normalizedPrefix}${folderName}/`;

    const folder = await prisma.storageObject.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        name: folderName,
        prefix: folderPath,
        size: 0,
        type: "folder",
        bucket: config.MINIO_BUCKET_NAME,
        isFolder: true,
      },
    });

    return folder;
  },

  /**
   * Delete a folder and its contents.
   */
  async deleteFolder(userId: string, folderId: string) {
    const folder = await prisma.storageObject.findUnique({
      where: { id: folderId, userId, isFolder: true },
    });

    if (!folder) {
      throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
    }

    await prisma.storageObject.deleteMany({
      where: {
        prefix: { startsWith: folder.prefix },
        userId,
      },
    });

    return { success: true };
  },

  /**
   * Rename a folder and update its prefix.
   */
  async renameFolder(userId: string, folderId: string, newName: string) {
    const folder = await prisma.storageObject.findUnique({
      where: { id: folderId, userId, isFolder: true },
    });

    if (!folder) {
      throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
    }

    const newPrefix = folder.prefix.replace(folder.name, newName);

    const updatedFolder = await prisma.storageObject.update({
      where: { id: folderId },
      data: { name: newName, prefix: newPrefix },
    });

    return updatedFolder;
  },
};
