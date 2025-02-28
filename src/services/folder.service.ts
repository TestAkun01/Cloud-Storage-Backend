import { prisma } from "../db";
import { config } from "../config";
import { CustomError } from "../errors/custom.error";

export const FolderService = {
  /**
   * Create a new folder.
   */
  async createFolder(userId: string, prefix: string = "/") {
    const normalizedPrefix =
      prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

    const folderName = normalizedPrefix.split("/").filter(Boolean).pop();

    if (!folderName) {
      throw new CustomError(
        "Invalid prefix: Unable to extract folder name",
        "INVALID_PREFIX",
        400
      );
    }

    const existingObject = await prisma.storageObject.findFirst({
      where: {
        userId,
        prefix: normalizedPrefix,
      },
    });

    if (existingObject) {
      throw new CustomError(
        "An object (file or folder) with the same path already exists",
        "OBJECT_ALREADY_EXISTS",
        400
      );
    }

    const existingChildPath = await prisma.storageObject.findFirst({
      where: {
        userId,
        prefix: {
          startsWith: normalizedPrefix,
          not: normalizedPrefix,
        },
      },
    });

    if (existingChildPath) {
      throw new CustomError(
        "Cannot create folder: A subfolder or file already exists within this path",
        "PARENT_PATH_CONFLICT",
        400
      );
    }

    const folder = await prisma.storageObject.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        name: folderName,
        prefix: normalizedPrefix,
        size: 0,
        type: "folder",
        bucket: config.MINIO_BUCKET_NAME,
        isFolder: true,
      },
    });

    return folder; // Hanya mengembalikan data folder yang dibuat
  },

  /**
   * Delete a folder and its contents.
   */
  async deleteFolder(userId: string, Prefix: string) {
    const normalizedPrefix =
      Prefix === "/" ? "/" : `/${Prefix.replace(/^\/|\/$/g, "")}/`;

    const folder = await prisma.storageObject.findFirst({
      where: {
        userId,
        OR: [
          { prefix: normalizedPrefix, isFolder: true },
          { prefix: { startsWith: normalizedPrefix } },
        ],
      },
    });

    if (!folder) {
      throw new CustomError("Folder not found", "FOLDER_NOT_FOUND", 404);
    }

    const deleteResult = await prisma.storageObject.deleteMany({
      where: {
        prefix: { startsWith: normalizedPrefix },
        userId,
      },
    });

    return deleteResult; // Hanya mengembalikan hasil operasi delete
  },

  /**
   * Rename a folder and update its prefix.
   */
  async renameFolder(userId: string, prefix: string, newName: string) {
    const normalizedPrefix =
      prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

    const currentFolderName = normalizedPrefix.split("/").filter(Boolean).pop();

    if (!currentFolderName) {
      throw new CustomError("Invalid folder path", "INVALID_FOLDER_PATH", 400);
    }

    const newPrefix = normalizedPrefix.replace(
      `${currentFolderName}/`,
      `${newName}/`
    );

    // Cek apakah folder atau file dengan newPrefix sudah ada
    const existingFolder = await prisma.storageObject.findFirst({
      where: {
        userId,
        prefix: newPrefix,
      },
    });

    if (existingFolder) {
      throw new CustomError(
        "A folder or file with the new name already exists",
        "NAME_CONFLICT",
        400
      );
    }

    // Ambil semua folder dan file yang memiliki prefix yang dimulai dengan normalizedPrefix
    const objectsToUpdate = await prisma.storageObject.findMany({
      where: {
        userId,
        prefix: { startsWith: normalizedPrefix },
      },
    });

    // Update prefix untuk setiap folder dan file
    for (const object of objectsToUpdate) {
      const updatedPrefix = object.prefix.replace(normalizedPrefix, newPrefix);

      await prisma.storageObject.update({
        where: { id: object.id },
        data: { prefix: updatedPrefix },
      });

      // Jika objek adalah folder yang sedang di-rename, update juga namanya
      if (object.prefix === normalizedPrefix && object.isFolder) {
        await prisma.storageObject.update({
          where: { id: object.id },
          data: { name: newName },
        });
      }
    }

    return { newName, newPrefix };
  },
};
