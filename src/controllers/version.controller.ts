import Elysia, { t } from "elysia";
import { VersionService } from "../services/version.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const VersionController = new Elysia({ prefix: "/versions" })
  .use(AuthMiddleware)
  .post(
    "/upload/:objectId",
    async ({ params, body, user, error }) => {
      try {
        const { objectId } = params;
        const { file } = body;
        const userId = user.id!.toString();

        const newVersion = await VersionService.uploadNewVersion(
          userId,
          objectId,
          file
        );
        return {
          success: true,
          message: "New file version uploaded successfully",
          data: newVersion,
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
          message: "Failed to upload new file version",
          error: {
            code: "VERSION_UPLOAD_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      params: t.Object({ objectId: t.String() }),
      body: t.Object({ file: t.File() }),
    }
  );
