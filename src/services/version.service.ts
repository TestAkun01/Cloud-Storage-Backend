import { prisma } from "../db";
import { config } from "../config";
import minioClient from "../lib/minio";
import { CustomError } from "../errors/custom.error";

export const VersionService = {
  /**
   * Upload a new version of a file.
   */
  async uploadNewVersion(userId: string, objectId: string, file: File) {
    const existingObject = await prisma.storageObject.findUnique({
      where: { id: objectId, userId },
    });

    if (!existingObject) {
      throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
    }

    const newObjectId = crypto.randomUUID();
    const minioFilePath = `${userId}/${newObjectId}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    await minioClient.putObject(
      config.MINIO_BUCKET_NAME,
      minioFilePath,
      fileBuffer
    );

    const newVersion = await prisma.storageObject.create({
      data: {
        id: newObjectId,
        userId,
        name: file.name,
        prefix: existingObject.prefix,
        size: file.size,
        type: file.type,
        bucket: config.MINIO_BUCKET_NAME,
        metadata: {
          lastModified: file.lastModified,
          lastModifiedDate: new Date(file.lastModified).toISOString(),
          previousVersionId: existingObject.id,
        },
      },
    });

    return newVersion;
  },
};
