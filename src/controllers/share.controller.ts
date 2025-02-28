import Elysia, { t } from "elysia";
import { ShareService } from "../services/share.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const ShareController = new Elysia({ prefix: "/share" })
  .use(AuthMiddleware)
  .post(
    "/with-user",
    async ({ body, user, error }) => {
      try {
        const { objectId, sharedWithUserId } = body;
        const sharedFile = await ShareService.shareFileWithUser(
          user.id!.toString(),
          objectId,
          sharedWithUserId
        );
        return {
          success: true,
          message: "File shared successfully",
          data: sharedFile,
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
          message: "Failed to share file",
          error: { code: "SHARE_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({
        objectId: t.String(),
        sharedWithUserId: t.String(),
      }),
    }
  )
  .post(
    "/generate-public-link",
    async ({ body, user, error }) => {
      try {
        const { objectId, expiresInSeconds } = body;
        const publicLink = await ShareService.generatePublicLink(
          objectId,
          expiresInSeconds
        );
        return {
          success: true,
          message: "Public link generated successfully",
          data: publicLink,
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
          message: "Failed to generate public link",
          error: {
            code: "PUBLIC_LINK_FAILED",
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
  .delete(
    "/revoke-access/:accessLinkId",
    async ({ params, user, error }) => {
      try {
        const { accessLinkId } = params;
        await ShareService.revokeAccess(accessLinkId);
        return {
          success: true,
          message: "Access revoked successfully",
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
          message: "Failed to revoke access",
          error: {
            code: "REVOKE_ACCESS_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      params: t.Object({ accessLinkId: t.String() }),
    }
  );
