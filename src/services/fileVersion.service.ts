import { prisma } from "../lib/prisma";
import { CustomError } from "../errors/custom.error";
import { minio } from "../lib/minio";
import { config } from "../config";

export const getFileVersions = async (fileId: string, userId: string) => {
  const file = await prisma.file.findUnique({
    where: { id: fileId, userId },
    include: { versions: true },
  });
  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }
  return file.versions;
};

export const createNewFileVersion = async (
  fileId: string,
  userId: string,
  file: File
) => {
  const existingFile = await prisma.file.findUnique({
    where: { id: fileId, userId },
  });
  if (!existingFile) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }

  await prisma.fileVersion.create({
    data: { fileId, path: existingFile.path, size: existingFile.size },
  });

  const filePath = `${userId}/${Date.now()}_${file.name}`;

  const arrayBuffer = await file.arrayBuffer();
  await minio.putObject(
    config.MINIO_BUCKET_NAME,
    filePath,
    Buffer.from(arrayBuffer),
    file.size,
    file
  );
  return await prisma.file.update({
    where: { id: fileId },
    data: { path: filePath, size: file.size },
  });
};

export const restoreFileVersion = async (
  fileId: string,
  versionId: string,
  userId: string
) => {
  const file = await prisma.file.findUnique({ where: { id: fileId, userId } });
  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }
  const version = await prisma.fileVersion.findUnique({
    where: { id: versionId, fileId },
  });
  if (!version) {
    throw new CustomError("Version not found", "VERSION_NOT_FOUND", 404);
  }

  return await prisma.file.update({
    where: { id: fileId },
    data: { path: version.path, size: version.size },
  });
};
