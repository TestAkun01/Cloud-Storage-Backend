import Elysia, { t } from "elysia";
import { prisma } from "../db";

export const TagController = new Elysia({ prefix: "/tags" })
  .get("/", async ({ error }) => {
    try {
      const tags = await prisma.tag.findMany();
      return {
        success: true,
        message: "Tags fetched successfully",
        data: tags,
      };
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "Failed to fetch tags",
        error: {
          code: "FETCH_FAILED",
          details: "An error occurred while fetching tags",
        },
      });
    }
  })
  .post(
    "/",
    async ({ body, error }) => {
      try {
        const { name } = body;
        const tag = await prisma.tag.create({ data: { name } });
        return {
          success: true,
          message: "Tag created successfully",
          data: tag,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to create tag",
          error: {
            code: "CREATE_FAILED",
            details: "An error occurred while creating the tag",
          },
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
        await prisma.tag.delete({ where: { id } });
        return { success: true, message: "Tag deleted successfully" };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to delete tag",
          error: {
            code: "DELETE_FAILED",
            details: "An error occurred while deleting the tag",
          },
        });
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    }
  );
