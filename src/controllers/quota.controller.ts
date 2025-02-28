import Elysia, { t } from "elysia";
import { QuotaService } from "../services/quota.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const QuotaController = new Elysia({ prefix: "/quota" })
  .use(AuthMiddleware)
  .get("/", async ({ user, error }) => {
    try {
      const userId = user.id!.toString();
      const quotaData = await QuotaService.getUserQuota(userId);
      return { success: true, data: quotaData };
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
        message: "Failed to fetch user quota",
        error: { code: "QUOTA_FETCH_FAILED", details: "Internal server error" },
      });
    }
  })
  .put(
    "/update",
    async ({ body, user, error }) => {
      try {
        const { storageLimit } = body;
        const userId = user.id!.toString();
        const updatedQuota = await QuotaService.updateUserQuota(
          userId,
          BigInt(storageLimit)
        );
        return {
          success: true,
          message: "Quota updated successfully",
          data: updatedQuota,
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
          message: "Failed to update quota",
          error: {
            code: "QUOTA_UPDATE_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      body: t.Object({
        storageLimit: t.Number(), // Batas penyimpanan dalam bytes
      }),
    }
  );
