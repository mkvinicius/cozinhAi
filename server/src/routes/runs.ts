import { Router, type RequestHandler } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { run, agente, empresa, membro } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { streamRun } from "../services/run-executor.js";
import type { RunMessage } from "@cozinhai/shared";

const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

async function resolveEmpresa(db: Db, slug: string, userId: string) {
  const [emp] = await db.select().from(empresa).where(eq(empresa.slug, slug));
  if (!emp) return null;
  const [mem] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, userId)));
  return mem ? emp : null;
}

export function runRoutes(db: Db): RequestHandler {
  const router = Router();

  /* --- List runs for an agent --- */
  router.get("/:slug/agentes/:agenteId/runs", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const runs = await db
      .select()
      .from(run)
      .where(and(eq(run.agenteId, p(req.params["agenteId"])), eq(run.empresaId, emp.id)))
      .orderBy(desc(run.iniciadoEm))
      .limit(50);

    res.json({ ok: true, data: runs });
  });

  /* --- Get single run --- */
  router.get("/:slug/runs/:runId", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [found] = await db
      .select()
      .from(run)
      .where(and(eq(run.id, p(req.params["runId"])), eq(run.empresaId, emp.id)));

    if (!found) { res.status(404).json({ ok: false, error: "Run não encontrado" }); return; }
    res.json({ ok: true, data: found });
  });

  /* --- Start a streaming chat with an agent (SSE) --- */
  router.post("/:slug/agentes/:agenteId/chat", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : null;
    if (!userId) { res.status(401).json({ ok: false, error: "Não autenticado" }); return; }

    const parsed = z
      .object({
        message: z.string().min(1).max(10000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string(), timestamp: z.string() }))
          .optional(),
        tarefaId: z.string().uuid().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.message });
      return;
    }

    const slug = p(req.params["slug"]);
    const agenteId = p(req.params["agenteId"]);

    /* Verify agent belongs to empresa */
    const emp = await resolveEmpresa(db, slug, userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada ou acesso negado" }); return; }

    const [ag] = await db
      .select({ id: agente.id })
      .from(agente)
      .where(and(eq(agente.id, agenteId), eq(agente.empresaId, emp.id)));
    if (!ag) { res.status(404).json({ ok: false, error: "Agente não encontrado" }); return; }

    /* Set up SSE */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    function send(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }

    try {
      const gen = streamRun(db, {
        empresaSlug: slug,
        agenteId,
        userId,
        input: parsed.data.message,
        ...(parsed.data.history !== undefined ? { history: parsed.data.history as RunMessage[] } : {}),
        ...(parsed.data.tarefaId !== undefined ? { tarefaId: parsed.data.tarefaId } : {}),
      });

      for await (const event of gen) {
        if (event.type === "token") send("token", { content: event.content });
        else if (event.type === "done") send("done", { runId: event.runId, tokens: event.tokensEstimated });
        else send("error", { message: event.message });
      }
    } catch (err) {
      send("error", { message: err instanceof Error ? err.message : "Erro interno" });
    } finally {
      res.end();
    }
  });

  return router as unknown as RequestHandler;
}
