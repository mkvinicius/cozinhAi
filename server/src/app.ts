import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import type { Db } from "@cozinhai/db";
import { config } from "./config.js";
import { createAuth } from "./auth/better-auth.js";
import { actorMiddleware } from "./middleware/auth.js";
import { healthRoutes } from "./routes/health.js";
import { empresaRoutes } from "./routes/empresa.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { tarefaRoutes } from "./routes/tarefas.js";
import { agenteRoutes } from "./routes/agentes.js";
import { cmvRoutes } from "./routes/cmv.js";

export function createApp(db: Db) {
  const app = express();
  const auth = createAuth(db);

  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  /* Better-auth handles /api/auth/* */
  app.all("/api/auth/*", toNodeHandler(auth));

  /* Actor resolution for all API routes */
  app.use("/api", actorMiddleware(auth));

  /* Routes */
  app.use("/api/health", healthRoutes());
  app.use("/api/onboarding", onboardingRoutes(db));
  app.use("/api/empresas", empresaRoutes(db));
  app.use("/api/empresas", tarefaRoutes(db));
  app.use("/api/empresas", agenteRoutes(db));
  app.use("/api/empresas", cmvRoutes(db));

  /* Catch-all for unknown routes */
  app.use((_req, res) => {
    res.status(404).json({ ok: false, error: "Rota não encontrada" });
  });

  return app;
}
