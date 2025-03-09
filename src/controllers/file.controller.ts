import { Elysia, t } from "elysia";
import {
  getFileDetail,
  getFileDownloadUrl,
  listFiles,
  moveFileToTrash,
  restoreFile,
  updateFileMetadata,
  uploadFile,
} from "../services/file.service";
import { CustomError } from "../errors/custom.error";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export const FileController = new Elysia({ prefix: "/files" })
  .use(AuthMiddleware)
  .post(
    "/upload",
    async ({ body, user, error }) => {
      try {
        if (!body.file) {
          throw new CustomError("File is required", "FILE_MISSING", 400);
        }

        const file = await uploadFile(
          user.id?.toString()!,
          body.file,
          body.folderId
        );
        return { success: true, data: file };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code },
          });
        }
        return error(500, {
          success: false,
          message: "File upload failed",
          error: { code: "UPLOAD_FAILED" },
        });
      }
    },
    {
      body: t.Object({
        file: t.File(),
        folderId: t.Optional(t.String({ format: "uuid" })),
      }),
    }
  )
  .get("/", async ({ user, error }) => {
    try {
      const files = await listFiles(user.id?.toString()!);
      return { success: true, data: files };
    } catch (err) {
      return error(500, {
        success: false,
        message: "Failed to fetch files",
        error: { code: "LIST_FILES_FAILED" },
      });
    }
  })
  .get("/:id", async ({ params, user, error }) => {
    try {
      const file = await getFileDetail(
        user.id?.toString()!,
        decodeURIComponent(params.id)
      );
      return { success: true, data: file };
    } catch (err) {
      if (err instanceof CustomError) {
        return error(err.statusCode, {
          success: false,
          message: err.message,
          error: { code: err.code },
        });
      }
      return error(500, {
        success: false,
        message: "Failed to fetch file details",
        error: { code: "FILE_DETAIL_FAILED" },
      });
    }
  })
  .get("/:id/download", async ({ params, user, error }) => {
    try {
      const { downloadUrl } = await getFileDownloadUrl(
        user.id?.toString()!,
        params.id
      );
      return { success: true, data: { downloadUrl } };
    } catch (err) {
      if (err instanceof CustomError) {
        return error(err.statusCode, {
          success: false,
          message: err.message,
          error: { code: err.code },
        });
      }
      return error(500, {
        success: false,
        message: "Failed to generate download URL",
        error: { code: "FILE_DOWNLOAD_FAILED" },
      });
    }
  })
  .put(
    "/:id",
    async ({ params, user, body, error }) => {
      try {
        const updatedFile = await updateFileMetadata(
          user.id?.toString()!,
          params.id,
          body.name
        );
        return { success: true, data: updatedFile };
      } catch (err) {
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code },
          });
        }
        return error(500, {
          success: false,
          message: "Failed to update file metadata",
          error: { code: "FILE_UPDATE_FAILED" },
        });
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
      }),
    }
  )

  .delete("/:id", async ({ params, user, error }) => {
    try {
      const response = await moveFileToTrash(user.id?.toString()!, params.id);
      return response;
    } catch (err) {
      if (err instanceof CustomError) {
        return error(err.statusCode, {
          success: false,
          message: err.message,
          error: { code: err.code },
        });
      }
      return error(500, {
        success: false,
        message: "Failed to delete file",
        error: { code: "FILE_DELETE_FAILED" },
      });
    }
  })
  .post("/:id/restore", async ({ params, user, error }) => {
    try {
      const response = await restoreFile(user.id?.toString()!, params.id);
      return response;
    } catch (err) {
      if (err instanceof CustomError) {
        return error(err.statusCode, {
          success: false,
          message: err.message,
          error: { code: err.code },
        });
      }
      return error(500, {
        success: false,
        message: "Failed to restore file",
        error: { code: "FILE_RESTORE_FAILED" },
      });
    }
  });
