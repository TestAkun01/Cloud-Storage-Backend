import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import minioClient from "../lib/minio";
import { config } from "../config";
import { CustomError } from "../errors/custom.error";

export const ObjectService = {
  /**
   * Upload a file to storage and save metadata to the database.
   */
  async uploadFile(userId: string, file: File, prefix: string = "/") {
    const normalizedPrefix =
      prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

    const bucket = config.MINIO_BUCKET_NAME;
    const objectId = crypto.randomUUID();
    const minioFilePath = `${userId}/${objectId}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await minioClient.putObject(bucket, minioFilePath, fileBuffer);

    const savedObject = await prisma.storageObject.create({
      data: {
        id: objectId,
        userId,
        name: file.name,
        prefix: normalizedPrefix,
        size: file.size,
        type: file.type,
        bucket,
        metadata: {
          lastModified: file.lastModified,
          lastModifiedDate: new Date(file.lastModified).toISOString(),
        },
      },
    });

    return savedObject;
  },

  /**
   * Update file metadata (name, description, tags).
   */
  async updateFileMetadata(
    userId: string,
    objectId: string,
    updates: { name?: string; description?: string; tags?: string[] }
  ) {
    const file = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
      include: { objectTags: { include: { tag: true } } },
    });

    if (!file) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
    const ext = extMatch ? `.${extMatch[1]}` : "";

    const updatedName =
      updates.name && !updates.name.includes(".")
        ? `${updates.name}${ext}`
        : updates.name || file.name;

    const updatedFile = await prisma.storageObject.update({
      where: { id: objectId },
      data: {
        name: updatedName,
        description: updates.description ?? file.description,
        objectTags: updates.tags
          ? {
              deleteMany: { objectId },
              create: updates.tags.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: { objectTags: { include: { tag: true } } },
    });

    return updatedFile;
  },

  /**
   * Download a file from storage.
   */
  async downloadFile(userId: string, objectId: string) {
    const file = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!file) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const minioPath = `${file.userId}/${file.id}`;
    const fileStream = await minioClient.getObject(file.bucket, minioPath);

    return { fileStream, fileName: file.name, fileType: file.type };
  },

  /**
   * Delete a file from storage and database.
   */
  async deleteFile(userId: string, objectId: string) {
    const file = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!file) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const minioFilePath = `${file.userId}/${file.id}`;
    await minioClient.removeObject(file.bucket, minioFilePath);
    await prisma.storageObject.delete({ where: { id: objectId } });

    return { success: true };
  },

  /**
   * List files and folders for a user.
   */
  async listFiles(userId: string, prefix: string = "/") {
    const normalizedPrefix =
      prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

    const objects = await prisma.storageObject.findMany({
      where: {
        userId,
        prefix: normalizedPrefix,
      },
    });

    const subfolders = await prisma.storageObject.findMany({
      where: {
        userId,
        prefix: {
          startsWith: normalizedPrefix,
          not: normalizedPrefix,
        },
        isFolder: true,
      },
      select: {
        prefix: true,
      },
      distinct: ["prefix"],
    });

    const folders = subfolders.map((subfolder) => {
      const folderName = subfolder.prefix
        .replace(normalizedPrefix, "")
        .split("/")
        .filter(Boolean)[0];
      return folderName;
    });

    const uniqueFolders = [...new Set(folders)];

    const breadcrumbs = prefix === "/" ? [] : prefix.split("/").filter(Boolean);

    return {
      folders: uniqueFolders.map((folder) => ({
        type: "folder",
        name: folder,
      })),
      files: objects.filter((obj) => !obj.isFolder),
      breadcrumbs,
    };
  },

  /**
   * Generate an access link for a file.
   */
  async generateAccessLink(
    userId: string,
    objectId: string,
    expiresInSeconds: number
  ) {
    const object = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!object) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const savedAccessLink = await prisma.accessLink.create({
      data: {
        objectId,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      },
    });

    return savedAccessLink;
  },

  /**
   * Move a file to a new prefix.
   */
  async moveFile(userId: string, objectId: string, newPrefix: string) {
    const object = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!object) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const normalizedPrefix =
      newPrefix === "/" ? "/" : `/${newPrefix.replace(/^\/|\/$/g, "")}/`;

    const updatedObject = await prisma.storageObject.update({
      where: { id: objectId },
      data: { prefix: normalizedPrefix, updatedAt: new Date() },
    });

    return updatedObject;
  },

  /**
   * Copy a file to a new location.
   */
  async copyFile(userId: string, objectId: string, newPrefix: string) {
    const object = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!object) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const normalizedPrefix =
      newPrefix === "/" ? "/" : `/${newPrefix.replace(/^\/|\/$/g, "")}/`;

    const newObjectId = crypto.randomUUID();
    const oldMinioPath = `${object.userId}/${object.id}`;
    const newMinioPath = `${object.userId}/${newObjectId}`;

    await minioClient.copyObject(
      object.bucket,
      newMinioPath,
      `${object.bucket}/${oldMinioPath}`
    );

    const copiedObject = await prisma.storageObject.create({
      data: {
        id: newObjectId,
        userId,
        name: object.name,
        prefix: normalizedPrefix,
        description: object.description,
        size: object.size,
        type: object.type,
        bucket: object.bucket,
        metadata: object.metadata ?? undefined,
      },
    });

    return copiedObject;
  },
};
