import { logger } from "@bogeychan/elysia-logger"
import { cors } from "@elysiajs/cors"
import { jwt } from "@elysiajs/jwt"
import { swagger } from "@elysiajs/swagger"
import { Elysia } from "elysia"
import { config } from "./config.ts"

export const app = new Elysia()
  .use(logger())
  .use(swagger())
  .use(cors())
  .use(jwt({ name:"accessToken", secret: config.JWT_ACCESS_SECRET, exp:"15m" }))
  .use( jwt({ name:"refreshToken", secret: config.JWT_REFRESH_SECRET, exp:"7d" }))
