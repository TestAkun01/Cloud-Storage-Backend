import { prisma } from "../lib/prisma";
import { CustomError } from "../errors/custom.error";

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
  path: string,
  size: number
) => {
  const file = await prisma.file.findUnique({ where: { id: fileId, userId } });
  if (!file) {
    throw new CustomError("File not found", "FILE_NOT_FOUND", 404);
  }
  return await prisma.fileVersion.create({
    data: { fileId, path, size },
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
