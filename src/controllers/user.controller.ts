import Elysia, { t } from "elysia";
import { UserService } from "../services/user.service";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { CustomError } from "../errors/custom.error";

export const UserController = new Elysia({ prefix: "/users" })
  .use(AuthMiddleware)
  .get("/me", async ({ user, error }) => {
    try {
      const userId = user.id!.toString();
      const userData = await UserService.fetchUserById(userId);
      return {
        success: true,
        message: "User data fetched successfully",
        data: userData,
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
        message: "Failed to fetch user data",
        error: { code: "FETCH_FAILED", details: "Internal server error" },
      });
    }
  })
  .put(
    "/me",
    async ({ body, user, error }) => {
      try {
        const userId = user.id!.toString();
        const { name, email, password } = body;
        const updatedUser = await UserService.updateUser(userId, {
          name,
          email,
          password,
        });
        return {
          success: true,
          message: "User updated successfully",
          data: updatedUser,
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
          message: "Failed to update user",
          error: { code: "UPDATE_FAILED", details: "Internal server error" },
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
      const userId = user.id!.toString();
      await UserService.deleteUser(userId);
      return { success: true, message: "User deleted successfully" };
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
        message: "Failed to delete user",
        error: { code: "DELETE_FAILED", details: "Internal server error" },
      });
    }
  });
