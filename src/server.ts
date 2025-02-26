import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import { UserController } from "./controllers/user.controller.ts";
import html from "@elysiajs/html";
import { TagController } from "./controllers/tag.controller.ts";
import { AuthController } from "./controllers/auth.controller.ts";
import { ObjectController } from "./controllers/object.controller.ts";

export const app = new Elysia()
  .use(
    logger({
      level: "info",
    })
  )
  .use(html())
  .use(swagger())
  .use(
    cors({
      credentials: true,
      origin: "https://localhost:5173",
      methods: ["GET", "POST", "DELETE", "PUT"],
    })
  )
  .use(ObjectController)
  .use(UserController)
  .use(TagController)
  .use(AuthController)
  .get("/*", () => ({}));

export type App = typeof app;
