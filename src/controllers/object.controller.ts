import Elysia, { t } from "elysia";
import { Prisma, prisma } from "../db";
import minioClient from "../services/minio";
import JwtPlugin from "../plugins/jwt.plugin";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { config } from "../config";

export const ObjectController = new Elysia({ prefix: "/objects" })
  .use(JwtPlugin)
  .use(AuthMiddleware)
  .post(
    "/upload",
    async ({ body, user, error }) => {
      try {
        const { file, prefix = "/" } = body;
        const normalizedPrefix =
          prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

        if (!file) {
          return error(400, {
            success: false,
            message: "No file provided",
            error: {
              code: "NO_FILE",
              details: "Please provide a file to upload",
            },
          });
        }

        const bucket = config.MINIO_BUCKET_NAME;
        const userId = user.id!.toString();

        const objectId = crypto.randomUUID();
        const fileName = file.name;
        const minioFilePath = `${userId}/${objectId}`;

        const fileBuffer = Buffer.from(await file.arrayBuffer());
        await minioClient.putObject(bucket, minioFilePath, fileBuffer);

        const savedObject = await prisma.storageObject.create({
          data: {
            id: objectId,
            userId,
            name: fileName,
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

        return {
          success: true,
          message: "File uploaded successfully",
          data: savedObject,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File upload failed",
          error: {
            code: "UPLOAD_FAILED",
            details: "An error occurred while uploading the file",
          },
        });
      }
    },
    {
      body: t.Object({ file: t.File(), prefix: t.String({ default: "/" }) }),
    }
  )

  .put(
    "/update",
    async ({ body, user, error }) => {
      try {
        const { objectId, name, description, tags } = body;

        if (!objectId) {
          return error(400, {
            success: false,
            message: "Object ID is required",
            error: {
              code: "MISSING_OBJECT_ID",
              details: "The objectId parameter is required",
            },
          });
        }

        const file = await prisma.storageObject.findUnique({
          where: { id: objectId, userId: user.id!.toString() },
          include: { objectTags: { include: { tag: true } } },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const extMatch = file.name.match(/\.([0-9a-z]+)$/i);
        const ext = extMatch ? `.${extMatch[1]}` : "";

        const updatedName =
          name && !name.includes(".") ? `${name}${ext}` : name || file.name;

        const updatedFile = await prisma.storageObject.update({
          where: { id: objectId },
          data: {
            name: updatedName,
            description: description ?? file.description,
            objectTags: tags
              ? {
                  deleteMany: { objectId },

                  create: tags.map((tagName) => ({
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

        return {
          success: true,
          message: "File metadata updated successfully",
          data: updatedFile,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to update file metadata",
          error: {
            code: "UPDATE_FAILED",
            details: "An error occurred while updating the file metadata",
          },
        });
      }
    },
    {
      body: t.Object({
        objectId: t.String(),
        name: t.Optional(t.String()),
        description: t.Optional(t.String()),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  .get(
    "/download/:objectId",
    async ({ params, set, user, error }) => {
      try {
        const objectId = decodeURI(params.objectId);
        if (!objectId) {
          return error(400, {
            success: false,
            message: "Object ID is required",
            error: {
              code: "MISSING_OBJECT_ID",
              details: "The objectId parameter is required",
            },
          });
        }

        const file = await prisma.storageObject.findUnique({
          where: { id: objectId, userId: user.id!.toString() },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const minioPath = `${file.userId}/${file.id}`;
        const fileStream = await minioClient.getObject(file.bucket, minioPath);

        set.headers[
          "content-disposition"
        ] = `attachment; filename="${file.name}"`;
        return fileStream;
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File download failed",
          error: {
            code: "DOWNLOAD_FAILED",
            details: "An error occurred while downloading the file",
          },
        });
      }
    },
    {
      params: t.Object({ objectId: t.String() }),
    }
  )

  .delete(
    "/delete/:objectId",
    async ({ params, user, error }) => {
      try {
        const objectId = decodeURI(params.objectId);
        if (!objectId) {
          return error(400, {
            success: false,
            message: "Object ID is required",
            error: {
              code: "MISSING_OBJECT_ID",
              details: "The objectId parameter is required",
            },
          });
        }

        const file = await prisma.storageObject.findUnique({
          where: { id: objectId, userId: user.id!.toString() },
        });

        if (!file) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const minioFilePath = `${file.userId}/${file.id}`;
        await minioClient.removeObject(file.bucket, minioFilePath);
        await prisma.storageObject.delete({ where: { id: objectId } });

        return { success: true, message: "File deleted successfully" };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "File deletion failed",
          error: {
            code: "DELETE_FAILED",
            details: "An error occurred while deleting the file",
          },
        });
      }
    },
    {
      params: t.Object({ objectId: t.String() }),
    }
  )

  .get(
    "/list",
    async ({ query, user, error }) => {
      try {
        const prefix = decodeURI(query.prefix || "/");
        const normalizedPrefix =
          prefix === "/" ? "/" : `/${prefix.replace(/^\/|\/$/g, "")}/`;

        const userId = user.id!.toString();
        const objects = await prisma.storageObject.findMany({
          where: {
            userId,
            OR: [
              {
                prefix: {
                  startsWith: normalizedPrefix,
                },
              },
              {
                prefix: normalizedPrefix,
              },
            ],
          },
        });

        const folders = new Set<string>();
        const files: Prisma.StorageObjectGetPayload<{}>[] = [];

        for (const obj of objects) {
          const relativePath = obj.prefix
            .replace(normalizedPrefix, "")
            .split("/")
            .filter(Boolean);

          if (relativePath.length > 0) {
            folders.add(relativePath[0] ?? "");
          }

          if (obj.prefix === normalizedPrefix) {
            files.push(obj);
          }
        }

        const breadcrumbs =
          prefix === "/" ? [] : prefix.split("/").filter(Boolean);

        return {
          success: true,
          data: {
            folders: Array.from(folders).map((folder) => ({
              type: "folder",
              name: folder,
            })),
            files,
            breadcrumbs,
          },
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to list files",
          error: {
            code: "LIST_ERROR",
            details: "An error occurred while listing the files",
          },
        });
      }
    },
    {
      query: t.Object({ prefix: t.Optional(t.String({ default: "/" })) }),
    }
  )

  .get(
    "/search",
    async ({ query, user, error }) => {
      try {
        const keyword = decodeURI(query.keyword);
        const userId = user.id!.toString();

        const objects = await prisma.storageObject.findMany({
          where: {
            userId,
            OR: [
              { name: { contains: keyword, mode: "insensitive" } },
              { description: { contains: keyword, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            prefix: true,
            description: true,
            size: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return { success: true, data: objects };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Search failed",
          error: {
            code: "SEARCH_ERROR",
            details: "An error occurred while searching for objects",
          },
        });
      }
    },
    {
      query: t.Object({ keyword: t.String() }),
    }
  )

  .post(
    "/generate-access-link",
    async ({ body, user, error }) => {
      try {
        const { objectId, expiresInSeconds } = body;

        if (!objectId) {
          return error(400, {
            success: false,
            message: "Object ID is required",
            error: {
              code: "MISSING_OBJECT_ID",
              details: "The objectId parameter is required",
            },
          });
        }

        const object = await prisma.storageObject.findUnique({
          where: { id: objectId, userId: user.id!.toString() },
        });

        if (!object) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const savedAccessLink = await prisma.accessLink.create({
          data: {
            objectId,
            expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
          },
        });

        return {
          success: true,
          message: "Access link generated successfully",
          data: {
            id: savedAccessLink.id,
            expiresAt: savedAccessLink.expiresAt,
          },
        };
      } catch (err) {
        console.error("Error generating access link:", err);
        return error(500, {
          success: false,
          message: "Failed to generate access link",
          error: {
            code: "ACCESS_LINK_ERROR",
            details: "An error occurred while generating the access link",
          },
        });
      }
    },
    {
      body: t.Object({
        objectId: t.String(),
        expiresInSeconds: t.Number(),
      }),
    }
  )
  .get(
    "/access/:accessLinkId",
    async ({ params, set, error }) => {
      try {
        const { accessLinkId } = params;

        const accessLink = await prisma.accessLink.findUnique({
          where: { id: accessLinkId },
          include: { object: true },
        });

        if (!accessLink) {
          return error(404, {
            success: false,
            message: "Access link not found",
            error: {
              code: "ACCESS_LINK_NOT_FOUND",
              details: "The requested access link does not exist",
            },
          });
        }

        if (new Date() > new Date(accessLink.expiresAt)) {
          return error(410, {
            success: false,
            message: "Access link has expired",
            error: {
              code: "ACCESS_LINK_EXPIRED",
              details: "The access link is no longer valid",
            },
          });
        }

        const fileStream = await minioClient.getObject(
          accessLink.object.bucket,
          `${accessLink.object.userId}/${accessLink.object.id}`
        );

        set.headers[
          "content-disposition"
        ] = `attachment; filename="${accessLink.object.name}"`;
        set.headers["content-type"] =
          accessLink.object.type || "application/octet-stream";

        return fileStream;
      } catch (err) {
        console.error("Error accessing file:", err);
        return error(500, {
          success: false,
          message: "Failed to access file",
          error: {
            code: "FILE_ACCESS_ERROR",
            details: "An error occurred while accessing the file",
          },
        });
      }
    },
    {
      params: t.Object({ accessLinkId: t.String() }),
    }
  )

  .put(
    "/move/:objectId",
    async ({ params, body, user, error }) => {
      try {
        const { objectId } = params;
        const { newPrefix } = body;

        const decodedObjectId = decodeURIComponent(objectId);

        const object = await prisma.storageObject.findUnique({
          where: { id: decodedObjectId, userId: user.id!.toString() },
        });

        if (!object) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const normalizedPrefix =
          newPrefix === "/" ? "/" : `/${newPrefix.replace(/^\/|\/$/g, "")}/`;

        const updatedObject = await prisma.storageObject.update({
          where: { id: decodedObjectId },
          data: { prefix: normalizedPrefix, updatedAt: new Date() },
        });

        return {
          success: true,
          message: "File prefix updated successfully",
          data: updatedObject,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to update file prefix",
          error: {
            code: "MOVE_FAILED",
            details: "An error occurred while updating the file prefix",
          },
        });
      }
    },
    {
      body: t.Object({
        newPrefix: t.String(),
      }),
      params: t.Object({ objectId: t.String() }),
    }
  )

  .post(
    "/copy/:objectId",
    async ({ params, body, user, error }) => {
      let object;
      let newMinioPath;

      try {
        const { objectId } = params;
        const { newPrefix } = body;

        const decodedObjectId = decodeURIComponent(objectId);

        object = await prisma.storageObject.findUnique({
          where: { id: decodedObjectId, userId: user.id!.toString() },
        });

        if (!object) {
          return error(404, {
            success: false,
            message: "File not found",
            error: {
              code: "FILE_NOT_FOUND",
              details: "The requested file does not exist",
            },
          });
        }

        const normalizedPrefix =
          newPrefix === "/" ? "/" : `/${newPrefix.replace(/^\/|\/$/g, "")}/`;

        const newObjectId = crypto.randomUUID();

        const oldMinioPath = `${object.userId}/${object.id}`;
        newMinioPath = `${object.userId}/${newObjectId}`;

        await minioClient.copyObject(
          object.bucket,
          newMinioPath,
          `${object.bucket}/${oldMinioPath}`
        );

        const copiedObject = await prisma.storageObject.create({
          data: {
            id: newObjectId,
            userId: user.id!.toString(),
            name: object.name,
            prefix: normalizedPrefix,
            description: object.description,
            size: object.size,
            type: object.type,
            bucket: object.bucket,
            metadata: object.metadata ?? undefined,
          },
        });

        return {
          success: true,
          message: "File copied successfully",
          data: copiedObject,
        };
      } catch (err) {
        console.error(err);

        if (object && newMinioPath) {
          try {
            await minioClient.removeObject(object.bucket, newMinioPath);
          } catch (removeErr) {
            console.error(
              "Failed to clean up copied file in MinIO:",
              removeErr
            );
          }
        }

        return error(500, {
          success: false,
          message: "Failed to copy file",
          error: {
            code: "COPY_FAILED",
            details: "An error occurred while copying the file",
          },
        });
      }
    },
    {
      body: t.Object({
        newPrefix: t.String(),
      }),
      params: t.Object({ objectId: t.String() }),
    }
  );
