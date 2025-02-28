import Elysia, { t } from "elysia";
import { SearchService } from "../services/search.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const SearchController = new Elysia({ prefix: "/search" })
  .use(AuthMiddleware)
  .get(
    "/by-tag",
    async ({ query, user, error }) => {
      try {
        const { tag } = query;
        const userId = user.id!.toString();
        const objects = await SearchService.searchByTag(userId, tag);
        return { success: true, data: objects };
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
          message: "Failed to search by tag",
          error: {
            code: "SEARCH_BY_TAG_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      query: t.Object({
        tag: t.String(),
      }),
    }
  )
  .get(
    "/by-date",
    async ({ query, user, error }) => {
      try {
        const { startDate, endDate } = query;
        const userId = user.id!.toString();
        const objects = await SearchService.searchByDate(
          userId,
          startDate,
          endDate
        );
        return { success: true, data: objects };
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
          message: "Failed to search by date range",
          error: {
            code: "SEARCH_BY_DATE_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      query: t.Object({
        startDate: t.String(),
        endDate: t.String(),
      }),
    }
  )
  .get(
    "/by-keyword",
    async ({ query, user, error }) => {
      try {
        const { keyword } = query;
        const userId = user.id!.toString();
        const objects = await SearchService.searchByKeyword(userId, keyword);
        return { success: true, data: objects };
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
          message: "Failed to search by keyword",
          error: {
            code: "SEARCH_BY_KEYWORD_FAILED",
            details: "Internal server error",
          },
        });
      }
    },
    {
      query: t.Object({
        keyword: t.String(),
      }),
    }
  );
