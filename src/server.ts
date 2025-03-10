import { fileLogger, logger } from "@bogeychan/elysia-logger";
import { cors } from "@elysiajs/cors";
import html from "@elysiajs/html";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { AuthController } from "./controllers/auth.controller.ts";
import { config } from "./config";
import { FileController } from "./controllers/file.controller.ts";
import { FolderController } from "./controllers/folder.controller.ts";
import { FileVersionController } from "./controllers/fileVersion.controller.ts";
import { ShareController } from "./controllers/share.controller.ts";

export const app = new Elysia({
  serve: {
    port: config.PORT,
    hostname: config.HOSTNAME,
    tls: config.SSL_ENABLED
      ? {
          cert: Bun.file(config.SSL_CERT_PATH),
          key: Bun.file(config.SSL_KEY_PATH),
        }
      : undefined,
  },
})
  .use(
    logger({
      level: "info",
    })
  )
  .use(
    fileLogger({
      file: "./my.log",
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
  .use(AuthController)
  .use(FileController)
  .use(FolderController)
  .use(FileVersionController)
  .use(ShareController)
  .get("/", () => {
    console.log(config.API_URL);
  });

export type App = typeof app;
