import Elysia, { t } from "elysia";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { prisma } from "../db";
import { hash } from "bcrypt";

export const UserController = new Elysia({ prefix: "/users" })
  .use(AuthMiddleware)
  .get("/me", async ({ user, error }) => {
    try {
      const userData = await prisma.user.findUnique({
        where: { id: user.id?.toString() },
        select: { id: true, email: true, name: true, createdAt: true },
      });

      if (!userData) {
        return error(404, {
          success: false,
          message: "User not found",
          error: {
            code: "USER_NOT_FOUND",
            details: "The requested user does not exist",
          },
        });
      }

      return {
        success: true,
        message: "User data fetched successfully",
        data: userData,
      };
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "Failed to fetch user data",
        error: {
          code: "FETCH_FAILED",
          details: "An error occurred while fetching user data",
        },
      });
    }
  })
  .put(
    "/me",
    async ({ body, user, error }) => {
      try {
        const { name, email, password } = body;

        const updatedUser = await prisma.user.update({
          where: { id: user.id?.toString() },
          data: {
            name: name || undefined,
            email: email || undefined,
            password: password ? await hash(password, 10) : undefined,
          },
        });

        return {
          success: true,
          message: "User updated successfully",
          data: updatedUser,
        };
      } catch (err) {
        console.error(err);
        return error(500, {
          success: false,
          message: "Failed to update user",
          error: {
            code: "UPDATE_FAILED",
            details: "An error occurred while updating the user",
          },
        });
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String()),
        email: t.Optional(t.String()),
        password: t.Optional(t.String()),
      }),
    }
  )
  .delete("/me", async ({ user, error }) => {
    try {
      await prisma.user.delete({ where: { id: user.id?.toString() } });
      return { success: true, message: "User deleted successfully" };
    } catch (err) {
      console.error(err);
      return error(500, {
        success: false,
        message: "Failed to delete user",
        error: {
          code: "DELETE_FAILED",
          details: "An error occurred while deleting the user",
        },
      });
    }
  });
