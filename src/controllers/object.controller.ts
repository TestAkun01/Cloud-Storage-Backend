import { Elysia, t } from "elysia";
import { ObjectService } from "../services/object.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import JwtPlugin from "../plugins/jwt.plugin";
import { CustomError } from "../errors/custom.error";
import minioClient from "../lib/minio";
import { prisma } from "../db";

export const ObjectController = new Elysia({ prefix: "/objects" })
  .use(JwtPlugin)
  .use(AuthMiddleware)
  .post(
    "/upload",
    async ({ body, user, error }) => {
      try {
        const { file, prefix = "/" } = body;
        const savedObject = await ObjectService.uploadFile(
          user.id!.toString(),
          file,
          prefix
        );
        return {
          success: true,
          message: "File uploaded successfully",
          data: savedObject,
        };
      } catch (err) {
        console.log(err);

        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "File upload failed",
          error: { code: "UPLOAD_FAILED", details: "Internal server error" },
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
        const updatedFile = await ObjectService.updateFileMetadata(
          user.id!.toString(),
          objectId,
          {
            name,
            description,
            tags,
          }
        );
        return {
          success: true,
          message: "File metadata updated successfully",
          data: updatedFile,
        };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to update file metadata",
          error: { code: "UPDATE_FAILED", details: "Internal server error" },
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
        const { objectId } = params;
        const { fileStream, fileName, fileType } =
          await ObjectService.downloadFile(user.id!.toString(), objectId);

        set.headers[
          "content-disposition"
        ] = `attachment; filename="${fileName}"`;
        set.headers["content-type"] = fileType || "application/octet-stream";
        return fileStream;
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "File download failed",
          error: { code: "DOWNLOAD_FAILED", details: "Internal server error" },
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
        const { objectId } = params;
        await ObjectService.deleteFile(user.id!.toString(), objectId);
        return { success: true, message: "File deleted successfully" };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "File deletion failed",
          error: { code: "DELETE_FAILED", details: "Internal server error" },
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
        const { prefix = "/" } = query;
        const result = await ObjectService.listFiles(
          user.id!.toString(),
          prefix
        );
        return { success: true, data: result };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to list files",
          error: { code: "LIST_ERROR", details: "Internal server error" },
        });
      }
    },
    {
      query: t.Object({ prefix: t.Optional(t.String({ default: "/" })) }),
    }
  )
  .post(
    "/generate-access-link",
    async ({ body, user, error }) => {
      try {
        const { objectId, expiresInSeconds } = body;
        const accessLink = await ObjectService.generateAccessLink(
          user.id!.toString(),
          objectId,
          expiresInSeconds
        );
        return {
          success: true,
          message: "Access link generated successfully",
          data: accessLink,
        };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to generate access link",
          error: {
            code: "ACCESS_LINK_ERROR",
            details: "Internal server error",
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
          throw new CustomError(
            "Access link not found",
            "ACCESS_LINK_NOT_FOUND",
            404
          );
        }

        if (new Date() > new Date(accessLink.expiresAt)) {
          throw new CustomError(
            "Access link has expired",
            "ACCESS_LINK_EXPIRED",
            410
          );
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
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to access file",
          error: {
            code: "FILE_ACCESS_ERROR",
            details: "Internal server error",
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
        const updatedObject = await ObjectService.moveFile(
          user.id!.toString(),
          objectId,
          newPrefix
        );
        return {
          success: true,
          message: "File moved successfully",
          data: updatedObject,
        };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to move file",
          error: { code: "MOVE_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({ newPrefix: t.String() }),
      params: t.Object({ objectId: t.String() }),
    }
  )
  .post(
    "/copy/:objectId",
    async ({ params, body, user, error }) => {
      try {
        const { objectId } = params;
        const { newPrefix } = body;
        const copiedObject = await ObjectService.copyFile(
          user.id!.toString(),
          objectId,
          newPrefix
        );
        return {
          success: true,
          message: "File copied successfully",
          data: copiedObject,
        };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to copy file",
          error: { code: "COPY_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({ newPrefix: t.String() }),
      params: t.Object({ objectId: t.String() }),
    }
  );
