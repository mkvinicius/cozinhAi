import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createDb } from "@cozinhai/db";
import { createApp } from "./app.js";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const db = createDb(config.databaseUrl);
  const app = createApp(db);

  /* 4. Static files + SPA fallback (production only, AFTER all API routes) */
  if (config.nodeEnv === "production") {
    const uiDist = path.join(__dirname, "../../ui/dist");
    app.use(express.static(uiDist));

    /* SPA fallback — any non-API route serves index.html */
    app.get("*path", (_req, res) => {
      res.sendFile(path.join(uiDist, "index.html"));
    });
  }

  /* 5. API 404 catch-all (only reached if no API route matched and not in production SPA) */
  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Rota não encontrada" });
  });

  app.listen(config.port, () => {
    console.log(`CozinhAI rodando em http://localhost:${config.port}`);
    console.log(`Ambiente: ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
