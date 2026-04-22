import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { empresa, membro } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const createEmpresaSchema = z.object({
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/),
  nome: z.string().min(2).max(100),
  tipo: z.string().default("restaurante"),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().length(2).default("SP"),
  metaCmvBps: z.number().int().min(1000).max(9000).default(3200),
});

export function empresaRoutes(db: Db) {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    const memberships = await db.query.membro.findMany({
      where: eq(membro.usuarioId, req.actor.type === "user" ? req.actor.userId : ""),
      with: { empresa: true },
    });
    res.json({ ok: true, data: memberships.map((m) => m.empresa) });
  });

  router.post("/", requireAuth, validateBody(createEmpresaSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : null;
    if (!userId) { res.status(401).json({ ok: false, error: "Não autenticado" }); return; }

    const [existing] = await db.select().from(empresa).where(eq(empresa.slug, req.body.slug));
    if (existing) { res.status(409).json({ ok: false, error: "Slug já em uso" }); return; }

    const [created] = await db.insert(empresa).values(req.body).returning();
    if (!created) { res.status(500).json({ ok: false, error: "Erro ao criar empresa" }); return; }

    await db.insert(membro).values({ empresaId: created.id, usuarioId: userId, role: "dono" });
    res.status(201).json({ ok: true, data: created });
  });

  router.get("/:slug", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : null;
    if (!userId) { res.status(401).json({ ok: false, error: "Não autenticado" }); return; }

    const [found] = await db.select().from(empresa).where(eq(empresa.slug, req.params["slug"] ?? ""));
    if (!found) { res.status(404).json({ ok: false, error: "Empresa não encontrada" }); return; }

    const [membership] = await db
      .select()
      .from(membro)
      .where(and(eq(membro.empresaId, found.id), eq(membro.usuarioId, userId)));
    if (!membership) { res.status(403).json({ ok: false, error: "Acesso negado" }); return; }

    res.json({ ok: true, data: found });
  });

  return router;
}
