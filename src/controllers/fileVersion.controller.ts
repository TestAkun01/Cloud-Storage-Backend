import { Elysia, t } from "elysia";
import {
  getFileVersions,
  createNewFileVersion,
  restoreFileVersion,
} from "../services/fileVersion.service";
import { CustomError } from "../errors/custom.error";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export const FileVersionController = new Elysia({ prefix: "/file-version" })
  .use(AuthMiddleware)
  .get("/:fileId/versions", async ({ params, user, error }) => {
    try {
      const versions = await getFileVersions(
        params.fileId,
        user.userId?.toString()!
      );
      return { success: true, data: versions };
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
        message: "Failed to get file versions",
        error: {
          code: "VERSION_FETCH_FAILED",
          details: "Internal server error",
        },
      });
    }
  })
  .post(
    "/:fileId/versions",
    async ({ params, body, user, error }) => {
      try {
        const version = await createNewFileVersion(
          params.fileId,
          user.userId?.toString()!,
          body.path,
          body.size
        );
        return { success: true, data: version };
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
          message: "Failed to add file version",
          error: {
            code: "VERSION_ADD_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        path: t.String(),
        size: t.Number(),
      }),
    }
  )
  .post(
    "/:fileId/versions/:versionId/restore",
    async ({ params, user, error }) => {
      try {
        await restoreFileVersion(
          params.fileId,
          params.versionId,
          user.userId?.toString()!
        );
        return { success: true, message: "File version restored successfully" };
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
          message: "Failed to restore file version",
          error: {
            code: "VERSION_RESTORE_FAILED",
            details: "Internal server error",
          },
        });
      }
    }
  );
