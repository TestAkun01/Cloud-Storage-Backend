import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia, t } from "elysia";
import FileController from "./controllers/file.controller.ts";
import UserController from "./controllers/auth.controller.ts";
import html from "@elysiajs/html";

export const app = new Elysia()
  .use(
    logger({
      level: "error",
    })
  )
  .use(html())
  .use(swagger())
  .use(
    cors({
      credentials: true,
      origin: "https://localhost:5173",
      methods: ["GET", "POST", "DELETE"],
    })
  )
  .get("/", () => {
    return Bun.file("src/index.html");
  })
  .get("/test/:test", ({ params }) => {
    return params;
  })
  .get("/test/*", ({ params }) => {
    return params;
  })
  .use(UserController)
  .use(FileController);

export type App = typeof app;
