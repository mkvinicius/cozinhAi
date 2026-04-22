import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { agente, run, empresa, membro } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const createAgenteSchema = z.object({
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  nome: z.string().min(2).max(100),
  papel: z.string().min(10),
  instrucoes: z.string().min(20),
  llmProvedor: z.enum(["claude", "gemini", "openai", "groq"]).optional(),
  llmModelo: z.string().optional(),
});

async function resolveEmpresa(db: Db, slug: string, userId: string) {
  const [emp] = await db.select().from(empresa).where(eq(empresa.slug, slug));
  if (!emp) return null;
  const [mem] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, userId)));
  return mem ? emp : null;
}

export function agenteRoutes(db: Db) {
  const router = Router();

  router.get("/:slug/agentes", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada ou acesso negado" }); return; }

    const agentes = await db
      .select()
      .from(agente)
      .where(and(eq(agente.empresaId, emp.id), eq(agente.ativo, true)))
      .orderBy(agente.nome);

    res.json({ ok: true, data: agentes });
  });

  router.get("/:slug/agentes/:id", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [found] = await db
      .select()
      .from(agente)
      .where(and(eq(agente.id, req.params["id"] ?? ""), eq(agente.empresaId, emp.id)));

    if (!found) { res.status(404).json({ ok: false, error: "Agente não encontrado" }); return; }
    res.json({ ok: true, data: found });
  });

  router.post("/:slug/agentes", requireAuth, validateBody(createAgenteSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [created] = await db.insert(agente).values({ ...req.body, empresaId: emp.id }).returning();
    res.status(201).json({ ok: true, data: created });
  });

  router.get("/:slug/agentes/:id/runs", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const runs = await db
      .select()
      .from(run)
      .where(and(eq(run.agenteId, req.params["id"] ?? ""), eq(run.empresaId, emp.id)))
      .orderBy(desc(run.iniciadoEm))
      .limit(50);

    res.json({ ok: true, data: runs });
  });

  return router;
}
