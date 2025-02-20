import env from "env-var";

export const config = {
  // Environment
  NODE_ENV: env
    .get("NODE_ENV")
    .default("development")
    .asEnum(["production", "test", "development"]),

  // Server
  API_URL: env
    .get("API_URL")
    .default(`https://${env.get("PUBLIC_DOMAIN").asString()}`)
    .asString(),
  PORT: env.get("PORT").default(3000).asPortNumber(),

  // Verrou
  LOCK_STORE: env.get("LOCK_STORE").default("memory").asEnum(["memory"]),

  // Database
  DATABASE_URL: env.get("DATABASE_URL").required().asString(),

  // JWT
  JWT_ACCESS_SECRET: env.get("JWT_ACCESS_SECRET").required().asString(),
  JWT_REFRESH_SECRET: env.get("JWT_REFRESH_SECRET").required().asString(),

  // MinIO
  MINIO_ENDPOINT: env.get("MINIO_ENDPOINT").default("localhost").asString(),
  MINIO_PORT: env.get("MINIO_PORT").default(9001).asPortNumber(),
  MINIO_ACCESS_KEY: env.get("MINIO_ACCESS_KEY").required().asString(),
  MINIO_SECRET_KEY: env.get("MINIO_SECRET_KEY").required().asString(),
  MINIO_USE_SSL: env.get("MINIO_USE_SSL").default("true").asBool(),
};
