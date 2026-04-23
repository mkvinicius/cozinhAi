import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createDb } from "@cozinhai/db";
import { createApp } from "./app.js";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const db = createDb(config.databaseUrl);
  const app = createApp(db);

  /* Serve built frontend in production */
  if (config.nodeEnv === "production") {
    const { default: serveStatic } = await import("serve-static");
    const uiDist = path.resolve(__dirname, "../../ui/dist");
    app.use(serveStatic(uiDist));
    /* SPA fallback — send index.html for all non-API routes */
    app.use((_req, res) => {
      res.sendFile(path.join(uiDist, "index.html"));
    });
  }

  app.listen(config.port, () => {
    console.log(`CozinhAI rodando em http://localhost:${config.port}`);
    console.log(`Ambiente: ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
