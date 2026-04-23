import "dotenv/config";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express";
import { createDb } from "@cozinhai/db";
import { createApp } from "./app.js";
import { config } from "./config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname = /root/cozinhai/server/dist
// ../../ui/dist = /root/cozinhai/ui/dist
const uiDist = path.resolve(__dirname, "..", "..", "ui", "dist");

async function main() {
  const db = createDb(config.databaseUrl);
  const app = createApp(db);

  /* Static files + SPA fallback — AFTER all API routes, BEFORE 404 */
  if (config.nodeEnv === "production") {
    console.log(`[static] ui/dist path: ${uiDist}`);
    console.log(`[static] exists: ${fs.existsSync(uiDist)}`);

    if (fs.existsSync(uiDist)) {
      app.use(express.static(uiDist));

      /* SPA fallback — any non-API route serves index.html */
      app.get("*path", (_req, res) => {
        res.sendFile(path.join(uiDist, "index.html"));
      });
    } else {
      console.warn(`[static] WARNING: ui/dist not found at ${uiDist} — frontend não será servido`);
    }
  }

  /* API 404 catch-all */
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
