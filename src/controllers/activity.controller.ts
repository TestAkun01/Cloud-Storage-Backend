import Elysia, { t } from "elysia";
import { ActivityService } from "../services/activity.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const ActivityController = new Elysia({ prefix: "/activity" })
  .use(AuthMiddleware)
  .get("/user", async ({ user, error }) => {
    try {
      const userId = user.id!.toString();
      const activities = await ActivityService.fetchUserActivity(userId);
      return {
        success: true,
        data: activities,
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
        message: "Failed to fetch user activity",
        error: {
          code: "FETCH_USER_ACTIVITY_FAILED",
          details: "Internal server error",
        },
      });
    }
  })
  .get(
    "/file/:objectId",
    async ({ params, user, error }) => {
      try {
        const { objectId } = params;
        const accessLogs = await ActivityService.fetchFileAccessLogs(objectId);
        return {
          success: true,
          data: accessLogs,
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
          message: "Failed to fetch file access log",
          error: {
            code: "FETCH_FILE_ACCESS_LOG_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      params: t.Object({ objectId: t.String() }),
    }
  );
