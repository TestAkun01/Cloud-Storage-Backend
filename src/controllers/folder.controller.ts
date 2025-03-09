import { Elysia, t } from "elysia";
import {
  createFolder,
  listFolders,
  getFolderContents,
  renameFolder,
  deleteFolder,
  restoreFolder,
} from "../services/folder.service";
import { CustomError } from "../errors/custom.error";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export const FolderController = new Elysia({ prefix: "/folders" })
  .use(AuthMiddleware)
  .post(
    "/",
    async ({ body, user, error }) => {
      try {
        const folder = await createFolder(
          user.id?.toString()!,
          body.name,
          body.parentId
        );
        return { success: true, data: folder };
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
          message: "Failed to create folder",
          error: {
            code: "CREATE_FOLDER_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        name: t.String(),
        parentId: t.Optional(t.String()),
      }),
    }
  )
  .get("/", async ({ user }) => {
    return { success: true, data: await listFolders(user.id?.toString()!) };
  })
  .get("/:id", async ({ params, user, error }) => {
    try {
      return {
        success: true,
        data: await getFolderContents(user.id?.toString()!, params.id),
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
        message: "Failed to get folder content",
        error: {
          code: "GET_FOLDER_CONTENT_FAILED",
          details: "Internal server error",
        },
      });
    }
  })
  .put(
    "/:id",
    async ({ params, body, user, error }) => {
      try {
        const folder = await renameFolder(
          user.id?.toString()!,
          params.id,
          body.name
        );
        return { success: true, data: folder };
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
          message: "Failed to rename folder",
          error: {
            code: "RENAME_FOLDER_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )
  .delete("/:id", async ({ params, user, error }) => {
    try {
      await deleteFolder(user.id?.toString()!, params.id);
      return { success: true, message: "Folder moved to trash" };
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
        message: "Failed to delete folder",
        error: {
          code: "DELETE_FOLDER_FAILED",
          details: "Internal server error",
        },
      });
    }
  })
  .post(
    "/:id/restore",
    async ({ params, user, error }) => {
      try {
        await restoreFolder(params.id, user.id?.toString()!);
        return { success: true, message: "Folder restored successfully" };
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
          message: "Failed to restore folder",
          error: { code: "RESTORE_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
