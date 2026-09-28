import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { configFromEnv } from "./config.js";
import { createApp } from "./app.js";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const config = configFromEnv();
const builtWeb = fileURLToPath(new URL("../../web/dist", import.meta.url));
if (!config.webRoot && existsSync(builtWeb)) config.webRoot = builtWeb;
const app = await createApp(config);
await app.listen({ port: config.port, host: config.host });
const shutdown = async () => {
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
