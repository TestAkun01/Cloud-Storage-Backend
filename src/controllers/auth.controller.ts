import { Elysia, t } from "elysia";
import JwtPlugin from "../plugins/jwt.plugin";
import {
  loginUser,
  refreshAccessToken,
  registerUser,
  logoutUser,
} from "../services/auth.service";
import { CustomError } from "../errors/custom.error";

export const AuthController = new Elysia({ prefix: "/auth" })
  .use(JwtPlugin)
  .post(
    "/register",
    async ({ body, error }) => {
      try {
        const user = await registerUser(body.email, body.password);
        return { success: true, data: { userId: user.id } };
      } catch (err) {
        console.log(err);
        if (err instanceof CustomError) {
          return error(err.statusCode, {
            success: false,
            message: err.message,
            error: { code: err.code, details: err.details },
          });
        }
        return error(500, {
          success: false,
          message: "Registration failed",
          error: { code: "REGISTER_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, accessJwt, refreshJwt, cookie, error }) => {
      try {
        const { accessToken, refreshToken } = await loginUser(
          body.email,
          body.password,
          accessJwt,
          refreshJwt
        );

        cookie.refreshToken?.set({
          value: refreshToken,
          httpOnly: true,
          secure: true,
          path: "/auth",
          sameSite: "none",
          maxAge: 7 * 86400,
        });

        return { success: true, data: { accessToken } };
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
          message: "Login failed",
          error: { code: "LOGIN_FAILED", details: "Internal server error" },
        });
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
      }),
    }
  )
  .post(
    "/refresh",
    async ({ cookie: { refreshToken }, refreshJwt, accessJwt, error }) => {
      try {
        if (!refreshToken?.value) {
          throw new CustomError("No refresh token", "TOKEN_MISSING", 400);
        }

        const { newAccessToken, newRefreshToken } = await refreshAccessToken(
          refreshToken.value,
          refreshJwt,
          accessJwt
        );

        refreshToken.set({
          value: newRefreshToken,
          httpOnly: true,
          secure: true,
          path: "/auth",
          sameSite: "none",
          maxAge: 7 * 86400,
        });

        return { success: true, data: { accessToken: newAccessToken } };
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
          message: "Token refresh failed",
          error: { code: "REFRESH_FAILED", details: "Internal server error" },
        });
      }
    }
  )
  .post("/logout", async ({ cookie: { refreshToken }, error }) => {
    try {
      if (!refreshToken?.value) {
        throw new CustomError("No refresh token", "TOKEN_MISSING", 400);
      }

      await logoutUser(refreshToken.value);

      refreshToken.remove();
      return { success: true, message: "Logged out" };
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
        message: "Logout failed",
        error: { code: "LOGOUT_FAILED", details: "Internal server error" },
      });
    }
  });
