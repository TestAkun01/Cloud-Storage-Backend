import Elysia, { t } from "elysia";
import { FolderService } from "../services/folder.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const FolderController = new Elysia({ prefix: "/folders" })
  .use(AuthMiddleware)
  .post(
    "/create",
    async ({ body, user, error }) => {
      try {
        const { prefix = "/" } = body;
        const data = await FolderService.createFolder(
          user.id!.toString(),
          prefix
        );
        return { success: true, message: "Folder created successfully", data };
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
            code: "FOLDER_CREATE_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        prefix: t.String({ default: "/" }),
      }),
    }
  )
  .delete(
    "/delete",
    async ({ body, user, error }) => {
      try {
        const { prefix } = body;
        const data = await FolderService.deleteFolder(
          user.id!.toString(),
          prefix
        );
        return { success: true, message: "Folder deleted successfully", data };
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
            code: "FOLDER_DELETE_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({ prefix: t.String() }),
    }
  )
  .put(
    "/rename-folder",
    async ({ body, user, error }) => {
      try {
        const { newName, prefix } = body;
        const data = await FolderService.renameFolder(
          user.id!.toString(),
          prefix,
          newName
        );
        return { success: true, message: "Folder renamed successfully", data };
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
            code: "FOLDER_RENAME_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({ newName: t.String(), prefix: t.String() }),
    }
  );
