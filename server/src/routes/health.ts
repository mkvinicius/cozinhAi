import { Router, type RequestHandler } from "express";

export function healthRoutes(): RequestHandler {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ ok: true, service: "cozinhai-server", version: "0.1.0" });
  });

  return router as unknown as RequestHandler;
}
