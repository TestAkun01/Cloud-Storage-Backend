import { Elysia, t } from "elysia";
import bcrypt from "bcrypt";
import zxcvbn from "zxcvbn";
import JwtPlugin from "../plugins/jwt.plugin";
import { prisma } from "../db";

export const AuthController = new Elysia({ prefix: "/auth" })
  .use(JwtPlugin)
  .post(
    "/register",
    async ({ body, error }) => {
      try {
        if (zxcvbn(body.password).score < 2) {
          return error(400, {
            success: false,
            message: "Password is too weak, please use a stronger one",
            error: {
              code: "WEAK_PASSWORD",
              details: "Password does not meet security requirements",
            },
          });
        }

        const hashedPassword = await bcrypt.hash(body.password, 10);
        const user = await prisma.user.create({
          data: {
            email: body.email,
            password: hashedPassword,
            name: body.name,
          },
        });

        return {
          success: true,
          message: "User registered successfully",
          data: { userId: user.id },
        };
      } catch (err) {
        if (err instanceof Error) {
          return error(500, {
            success: false,
            message: "Registration failed",
            error: {
              code: "INTERNAL_ERROR",
              details: err.message,
            },
          });
        }
        return error(500, {
          success: false,
          message: "Registration failed",
          error: {
            code: "INTERNAL_ERROR",
            details: "An unknown error occurred",
          },
        });
      }
    },
    {
      body: t.Object({
        email: t.String({ format: "email" }),
        password: t.String(),
        name: t.String(),
      }),
    }
  )
  .post(
    "/login",
    async ({ body, accessJwt, refreshJwt, cookie, error }) => {
      try {
        const user = await prisma.user.findUnique({
          where: { email: body.email },
        });

        if (!user || !(await bcrypt.compare(body.password, user.password))) {
          return error(401, {
            success: false,
            message: "Invalid credentials",
            error: {
              code: "INVALID_CREDENTIALS",
              details: "Email or password is incorrect",
            },
          });
        }

        const accessToken = await accessJwt.sign({
          id: user.id,
          email: user.email,
          name: user.name,
        });

        const refreshToken = await refreshJwt.sign({ id: user.id });

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.$transaction(async (tx) => {
          await tx.refreshToken.upsert({
            where: { userId: user.id?.toString() },
            update: { token: refreshToken, expiresAt },
            create: { userId: user.id, token: refreshToken, expiresAt },
          });
        });

        cookie.refreshToken?.set({
          value: refreshToken,
          httpOnly: true,
          secure: true,
          path: "/auth",
          sameSite: "none",
        });

        return {
          success: true,
          message: "Login successful",
          data: { accessToken },
        };
      } catch (err) {
        return error(500, {
          success: false,
          message: "Login failed",
          error: {
            code: "INTERNAL_ERROR",
            details: "An unknown error occurred",
          },
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
        if (!refreshToken) {
          return error(400, {
            success: false,
            message: "No refresh token provided",
            error: {
              code: "MISSING_REFRESH_TOKEN",
              details: "Refresh token not found",
            },
          });
        }

        const decoded = await refreshJwt.verify(refreshToken.value);
        if (!decoded) {
          return error(401, {
            success: false,
            message: "Invalid refresh token",
            error: {
              code: "INVALID_REFRESH_TOKEN",
              details: "Refresh token is invalid",
            },
          });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.id?.toString() },
        });

        if (!user) {
          return error(404, {
            success: false,
            message: "User not found",
            error: {
              code: "USER_NOT_FOUND",
              details: "User not found",
            },
          });
        }

        const [storedToken, newAccessToken, newRefreshToken] =
          await prisma.$transaction(async (tx) => {
            const storedToken = await tx.refreshToken.findUnique({
              where: { token: refreshToken.value },
            });

            if (!storedToken) {
              throw new Error("Invalid refresh token");
            }

            if (new Date() > storedToken.expiresAt) {
              await tx.refreshToken.delete({
                where: { token: refreshToken.value },
              });
              throw new Error("Refresh token expired");
            }

            await tx.refreshToken.delete({
              where: { token: refreshToken.value },
            });

            const newAccessToken = await accessJwt.sign({
              id: user.id,
              email: user.email,
              name: user.name,
            });

            const newRefreshToken = await refreshJwt.sign({ id: user.id });

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await tx.refreshToken.upsert({
              where: { userId: user.id },
              update: { token: newRefreshToken, expiresAt },
              create: { userId: user.id, token: newRefreshToken, expiresAt },
            });

            return [storedToken, newAccessToken, newRefreshToken];
          });

        refreshToken.set({
          value: newRefreshToken,
          httpOnly: true,
          secure: true,
          path: "/auth",
          sameSite: "none",
        });

        return {
          success: true,
          message: "Token refreshed successfully",
          data: { accessToken: newAccessToken },
        };
      } catch (err) {
        return error(500, {
          success: false,
          message: "Token refresh failed",
          error: {
            code: "INTERNAL_ERROR",
            details: "An unknown error occurred",
          },
        });
      }
    }
  )
  .post("/logout", async ({ cookie: { refreshToken }, error }) => {
    try {
      if (!refreshToken) {
        return error(401, {
          success: false,
          message: "Refresh token not found",
          error: {
            code: "MISSING_REFRESH_TOKEN",
            details: "Refresh token not found",
          },
        });
      }

      await prisma.refreshToken.delete({
        where: { token: refreshToken.value },
      });

      refreshToken.remove();

      return { success: true, message: "Logged out successfully" };
    } catch (err) {
      return error(500, {
        success: false,
        message: "Logout failed",
        error: {
          code: "INTERNAL_ERROR",
          details: "An unknown error occurred",
        },
      });
    }
  });
