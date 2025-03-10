import { Elysia, t } from "elysia";
import {
  shareItem,
  listSharedItems,
  revokeShare,
} from "../services/share.service";
import { CustomError } from "../errors/custom.error";
import { AuthMiddleware } from "../middlewares/auth.middleware";

export const ShareController = new Elysia({ prefix: "/share" })
  .use(AuthMiddleware)
  .get("/", async ({ user, error }) => {
    try {
      const shares = await listSharedItems(user.userId?.toString()!);
      return { success: true, data: shares };
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
        message: "Failed to get shared files and folders",
        error: {
          code: "SHARE_FETCH_FAILED",
          details: "Internal server error",
        },
      });
    }
  })
  .post(
    "/",
    async ({ body, user, error }) => {
      try {
        const share = await shareItem(
          user.userId?.toString()!,
          body.targetUserId,
          body.resourceId,
          body.resourceType,
          body.permission
        );
        return { success: true, data: share };
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
          message: "Failed to share resource",
          error: {
            code: "SHARE_CREATE_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        targetUserId: t.String(),
        resourceId: t.String(),
        resourceType: t.Enum({ file: "file", folder: "folder" }),
        permission: t.Enum({ READ: "READ", WRITE: "WRITE" }),
      }),
    }
  )
  .delete("/:shareId", async ({ params, user, error }) => {
    try {
      await revokeShare(params.shareId, user.userId?.toString()!);
      return { success: true, message: "Share removed successfully" };
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
        message: "Failed to remove share",
        error: {
          code: "SHARE_REMOVE_FAILED",
          details: "Internal server error",
        },
      });
    }
  });
