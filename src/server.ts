import { logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import FileController from "./controllers/file.controller.ts";

export const app = new Elysia()
  .use(
    logger({
      level: "error",
    })
  )
  .use(swagger())
  .use(
    cors({
      origin: ["http://127.0.0.1:5500"],
      methods: ["GET", "POST", "DELETE"],
    })
  )
  .use(FileController);
