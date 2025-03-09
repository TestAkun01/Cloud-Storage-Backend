import jwt from "@elysiajs/jwt"
import Elysia from "elysia"
import { config } from "../config"

const JwtPlugin = new Elysia()
  .use(jwt({ name: "accessJwt", secret: config.JWT_ACCESS_SECRET, exp: "15m" }))
  .use(
    jwt({ name: "refreshJwt", secret: config.JWT_REFRESH_SECRET, exp: "7d" }),
  )
  .as("plugin")

export default JwtPlugin
