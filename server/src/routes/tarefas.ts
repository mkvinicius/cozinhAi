import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { tarefa, comentario, empresa, membro } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const createTarefaSchema = z.object({
  titulo: z.string().min(1).max(255),
  descricao: z.string().optional(),
  prioridade: z.enum(["urgente", "alta", "normal", "baixa"]).default("normal"),
  agenteId: z.string().uuid().optional(),
  prazo: z.string().datetime().optional(),
  contexto: z.record(z.unknown()).optional(),
});

const updateTarefaSchema = z.object({
  status: z.enum(["pendente", "em_progresso", "aguardando", "concluida", "cancelada"]).optional(),
  prioridade: z.enum(["urgente", "alta", "normal", "baixa"]).optional(),
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
});

async function checkMembership(db: Db, slug: string, userId: string) {
  const [emp] = await db.select().from(empresa).where(eq(empresa.slug, slug));
  if (!emp) return null;
  const [mem] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, userId)));
  return mem ? emp : null;
}

export function tarefaRoutes(db: Db) {
  const router = Router();

  router.get("/:slug/tarefas", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await checkMembership(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada ou acesso negado" }); return; }

    const items = await db.query.tarefa.findMany({
      where: eq(tarefa.empresaId, emp.id),
      orderBy: [desc(tarefa.createdAt)],
      with: { agente: true },
    });
    res.json({ ok: true, data: items });
  });

  router.post("/:slug/tarefas", requireAuth, validateBody(createTarefaSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await checkMembership(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada ou acesso negado" }); return; }

    const [created] = await db
      .insert(tarefa)
      .values({ ...req.body, empresaId: emp.id, criadoPorId: userId, prazo: req.body.prazo ? new Date(req.body.prazo) : undefined })
      .returning();
    res.status(201).json({ ok: true, data: created });
  });

  router.patch("/:slug/tarefas/:id", requireAuth, validateBody(updateTarefaSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await checkMembership(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(tarefa)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(tarefa.id, req.params["id"] ?? ""), eq(tarefa.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Tarefa não encontrada" }); return; }
    res.json({ ok: true, data: updated });
  });

  router.post("/:slug/tarefas/:id/comentarios", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await checkMembership(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(403).json({ ok: false, error: "Acesso negado" }); return; }

    const { conteudo } = z.object({ conteudo: z.string().min(1) }).parse(req.body);
    const [created] = await db
      .insert(comentario)
      .values({ tarefaId: req.params["id"] ?? "", autorId: userId, conteudo })
      .returning();
    res.status(201).json({ ok: true, data: created });
  });

  return router;
}
