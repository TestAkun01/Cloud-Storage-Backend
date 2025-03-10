import { prisma } from "../lib/prisma";
import { minio } from "../lib/minio";
import { CustomError } from "../errors/custom.error";
import { config } from "../config";
import { checkWritePermission } from "../utils";

export const uploadFile = async (
  userId: string,
  file: File,
  folderId?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { usedSpace: true, quota: true },
  });

  if (!user) {
    throw new CustomError("User not found", "USER_NOT_FOUND", 404);
  }

  if (BigInt(user.usedSpace) + BigInt(file.size) > user.quota) {
    throw new CustomError("Storage quota exceeded", "QUOTA_EXCEEDED", 403);
  }

  if (folderId) {
    const hasWritePermission = await checkWritePermission(folderId, userId);
    if (!hasWritePermission) {
      throw new CustomError(
        "No permission to upload here",
        "NO_PERMISSION",
        403
      );
    }
  }

  const filePath = `${userId}/${Date.now()}_${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  await minio.putObject(
    config.MINIO_BUCKET_NAME,
    filePath,
    Buffer.from(arrayBuffer),
    file.size,
    file
  );

  const newFile = await prisma.file.create({
    data: {
      name: file.name,
      path: filePath,
      size: file.size,
      type: file.type,
      userId,
      folderId: folderId ?? null,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { usedSpace: user.usedSpace + file.size },
  });

  return newFile;
};

export const listFiles = async (userId: string) => {
  const files = await prisma.file.findMany({
    where: {
      OR: [{ userId, trashed: false }, { sharedWith: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      path: true,
      size: true,
      type: true,
      cdnUrl: true,
      createdAt: true,
      updatedAt: true,
      folder: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return files;
};

export const getFileDetail = async (userId: string, fileId: string) => {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
      OR: [{ userId }, { sharedWith: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      path: true,
      size: true,
      type: true,
      cdnUrl: true,
      trashed: true,
      createdAt: true,
      updatedAt: true,
      folder: {
        select: { id: true, name: true },
      },
      tags: {
        select: { id: true, name: true },
      },
    },
  });

  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }

  return file;
};

export const getFileDownloadUrl = async (userId: string, fileId: string) => {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
      OR: [{ userId }, { sharedWith: { some: { userId } } }],
    },
    select: {
      id: true,
      path: true,
      cdnUrl: true,
      trashed: true,
    },
  });

  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }

  if (file.trashed) {
    throw new CustomError("File is in trash", "FILE_IN_TRASH", 403);
  }

  return { downloadUrl: file.cdnUrl || file.path };
};

export const updateFileMetadata = async (
  userId: string,
  fileId: string,
  name: string
) => {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
      OR: [{ userId }, { sharedWith: { some: { userId } } }],
    },
  });

  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: { name },
    select: {
      id: true,
      name: true,
      updatedAt: true,
    },
  });

  return updatedFile;
};

export const moveFileToTrash = async (userId: string, fileId: string) => {
  const file = await prisma.file.findUnique({
    where: {
      id: fileId,
      OR: [{ userId }, { sharedWith: { some: { userId } } }],
    },
  });

  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }

  if (file.trashed) {
    throw new CustomError("File is already in trash", "ALREADY_TRASHED", 400);
  }

  await prisma.$transaction([
    prisma.file.update({
      where: { id: fileId },
      data: { trashed: true },
    }),
    prisma.trash.create({
      data: {
        fileId: fileId,
        userId: userId,
      },
    }),
  ]);

  return { success: true, message: "File moved to trash" };
};

export const restoreFile = async (userId: string, fileId: string) => {
  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      trashed: true,
      OR: [
        { userId },
        { sharedWith: { some: { userId, permission: "WRITE" } } },
      ],
    },
  });

  if (!file) {
    throw new CustomError(
      "File not found or not in trash",
      "FILE_NOT_FOUND",
      404
    );
  }

  await prisma.$transaction([
    prisma.file.update({
      where: { id: fileId },
      data: { trashed: false },
    }),
    prisma.trash.delete({
      where: { fileId },
    }),
  ]);

  return { success: true, message: "File restored successfully" };
};
