import Elysia from "elysia";
import JwtPlugin from "../plugins/jwt.plugin";
import { prisma } from "../lib/prisma";

export const AuthMiddleware = new Elysia()
  .use(JwtPlugin)
  .derive(async ({ headers, accessJwt, error }) => {
    const token = headers.authorization?.split(" ")[1];
    if (!token) {
      return error(401, {
        success: false,
        message: "Unauthorized",
        error: {
          code: "MISSING_TOKEN",
          details: "No authorization token provided",
        },
      });
    }

    const payload = await accessJwt.verify(token);
    if (!payload) {
      return error(401, {
        success: false,
        message: "Unauthorized",
        error: { code: "INVALID_TOKEN", details: "Invalid or expired token" },
      });
    }
    return { user: payload };
  })
  .as("plugin");

export const checkEmailExists = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    throw new Error("Email already in use");
  }
};
