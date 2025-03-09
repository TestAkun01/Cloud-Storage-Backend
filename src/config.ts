import env from "env-var";

export const config = {
  // Environment
  NODE_ENV: env
    .get("NODE_ENV")
    .default("development")
    .asEnum(["production", "test", "development"]),

  // Server
  API_URL: env.get("API_URL").required().asString(),
  HOSTNAME: env.get("HOSTNAME").default("localhost").asString(),
  PORT: env.get("PORT").default(3000).asPortNumber(),

  // SSL Configuration
  SSL_ENABLED: env.get("SSL_ENABLED").default("false").asBool(),
  SSL_CERT_PATH: env.get("SSL_CERT_PATH").required().asString(),
  SSL_KEY_PATH: env.get("SSL_KEY_PATH").required().asString(),

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
  MINIO_BUCKET_NAME: env.get("MINIO_BUCKET_NAME").required().asString(),
};
