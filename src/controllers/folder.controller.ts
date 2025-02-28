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
        const { folderName, prefix = "/" } = body;
        await FolderService.createFolder(
          user.id!.toString(),
          folderName,
          prefix
        );
        return { success: true, message: "Folder created successfully" };
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
        folderName: t.String(),
        prefix: t.Optional(t.String({ default: "/" })),
      }),
    }
  )
  .delete(
    "/delete/:folderId",
    async ({ params, user, error }) => {
      try {
        const { folderId } = params;
        await FolderService.deleteFolder(user.id!.toString(), folderId);
        return { success: true, message: "Folder deleted successfully" };
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
      params: t.Object({ folderId: t.String() }),
    }
  )
  .put(
    "/rename-folder/:folderId",
    async ({ params, body, user, error }) => {
      try {
        const { folderId } = params;
        const { newName } = body;
        await FolderService.renameFolder(
          user.id!.toString(),
          folderId,
          newName
        );
        return { success: true, message: "Folder renamed successfully" };
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
      params: t.Object({ folderId: t.String() }),
      body: t.Object({ newName: t.String() }),
    }
  );
