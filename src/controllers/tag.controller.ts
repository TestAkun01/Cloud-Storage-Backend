import Elysia, { t } from "elysia";
import { TagService } from "../services/tag.service";
import { CustomError } from "../errors/custom.error";

export const TagController = new Elysia({ prefix: "/tags" })
  .get("/", async ({ error }) => {
    try {
      const tags = await TagService.fetchTags();
      return {
        success: true,
        message: "Tags fetched successfully",
        data: tags,
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
        message: "Failed to fetch tags",
        error: { code: "FETCH_FAILED", details: "Internal server error" },
      });
    }
  })
  .post(
    "/",
    async ({ body, error }) => {
      try {
        const { name } = body;
        const tag = await TagService.createTag(name);
        return {
          success: true,
          message: "Tag created successfully",
          data: tag,
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
          message: "Failed to create tag",
          error: { code: "CREATE_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({
        name: t.String(),
      }),
    }
  )
  .delete(
    "/:id",
    async ({ params, error }) => {
      try {
        const { id } = params;
        await TagService.deleteTag(id);
        return { success: true, message: "Tag deleted successfully" };
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
          message: "Failed to delete tag",
          error: { code: "DELETE_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
