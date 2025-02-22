import { config } from "./config.ts";
import { prisma } from "./db/index.ts";
import { app } from "./server.ts";
const signals = ["SIGINT", "SIGTERM"];

for (const signal of signals) {
  process.on(signal, async () => {
    console.log(`Received ${signal}. Initiating graceful shutdown...`);
    await app.stop();
    process.exit(0);
  });
}

process.on("uncaughtException", (error) => {
  console.error(error);
});

process.on("unhandledRejection", (error) => {
  console.error(error);
});

await prisma.$connect();
console.log("🗄️ Database was connected!");

app.listen(
  {
    port: config.PORT,
    tls: {
      key: Bun.file("C:/Users/REDMIBOOK/localhost+1-key.pem"),
      cert: Bun.file("C:/Users/REDMIBOOK/localhost+1.pem"),
    },
  },
  () => {
    console.log(`🦊 Server started at ${app.server?.url.origin}`);
  }
);
