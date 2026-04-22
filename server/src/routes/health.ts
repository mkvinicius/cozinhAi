import { Router } from "express";

export function healthRoutes() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({ ok: true, service: "cozinhai-server", version: "0.1.0" });
  });

  return router;
}
