import { Router, type RequestHandler } from "express";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import {
  empresa,
  membro,
  cmvSnapshot,
  cmvFornecedor,
  cmvInsumo,
  cmvCompra,
  cmvCompraItem,
  cmvAlerta,
  cmvFaturamento,
} from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { calcularCmv, recalcularMesAtual } from "../services/cmv-calculator.js";
import { verificarAlertasPostCompra } from "../services/cmv-alerts.js";

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

/* ---- schemas ---- */

const compraSchema = z.object({
  fornecedorId: z.string().uuid().optional(),
  numeroNf: z.string().optional(),
  dataCompra: z.string().datetime(),
  totalCentavos: z.number().int().positive(),
  observacoes: z.string().optional(),
  itens: z.array(
    z.object({
      insumoId: z.string().uuid().optional(),
      descricao: z.string().min(1),
      quantidade: z.number().positive(),
      unidade: z.enum(["kg", "g", "litro", "ml", "unidade", "porcao", "caixa", "pacote"]),
      precoCentavos: z.number().int().positive(),
      totalCentavos: z.number().int().positive(),
    }),
  ).min(1),
});

const faturamentoSchema = z.object({
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2020).max(2100),
  faturamentoCentavos: z.number().int().positive(),
  totalClientes: z.number().int().positive().optional(),
  observacoes: z.string().optional(),
});

const fornecedorSchema = z.object({
  nome: z.string().min(2).max(100),
  cnpj: z.string().optional(),
  contato: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  telefone: z.string().optional(),
  observacoes: z.string().optional(),
});

const insumoSchema = z.object({
  nome: z.string().min(2).max(100),
  categoria: z.string().optional(),
  unidade: z.enum(["kg", "g", "litro", "ml", "unidade", "porcao", "caixa", "pacote"]).default("kg"),
  precoReferenciaCentavos: z.number().int().positive().optional(),
  fornecedorPrincipalId: z.string().uuid().optional(),
  estoqueMinimo: z.number().int().positive().optional(),
});

export function cmvRoutes(db: Db): RequestHandler {
  const router = Router();

  /* ================================================================
     DASHBOARD — dados do mês atual
     ================================================================ */

  router.get("/:slug/cmv", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const now = new Date();
    const result = await calcularCmv(db, emp.id, now.getMonth() + 1, now.getFullYear());
    res.json({ ok: true, data: result });
  });

  /* Histórico dos últimos 12 meses */
  router.get("/:slug/cmv/historico", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const snapshots = await db
      .select()
      .from(cmvSnapshot)
      .where(eq(cmvSnapshot.empresaId, emp.id))
      .orderBy(desc(cmvSnapshot.dataInicio))
      .limit(12);

    res.json({ ok: true, data: snapshots.reverse() });
  });

  /* CMV para mês/ano específico */
  router.get("/:slug/cmv/:ano/:mes", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const mes = parseInt(p(req.params["mes"]));
    const ano = parseInt(p(req.params["ano"]));
    if (!mes || !ano) { res.status(400).json({ ok: false, error: "Mês/ano inválido" }); return; }

    const result = await calcularCmv(db, emp.id, mes, ano);
    res.json({ ok: true, data: result });
  });

  /* ================================================================
     ALERTAS
     ================================================================ */

  router.get("/:slug/cmv/alertas", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const alertas = await db
      .select()
      .from(cmvAlerta)
      .where(and(eq(cmvAlerta.empresaId, emp.id), eq(cmvAlerta.resolvido, false)))
      .orderBy(desc(cmvAlerta.createdAt));

    res.json({ ok: true, data: alertas });
  });

  router.patch("/:slug/cmv/alertas/:id/resolver", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(cmvAlerta)
      .set({ resolvido: true, resolvidoEm: new Date() })
      .where(and(eq(cmvAlerta.id, p(req.params["id"])), eq(cmvAlerta.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Alerta não encontrado" }); return; }
    res.json({ ok: true, data: updated });
  });

  /* ================================================================
     COMPRAS
     ================================================================ */

  router.get("/:slug/compras", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const compras = await db.query.cmvCompra.findMany({
      where: eq(cmvCompra.empresaId, emp.id),
      orderBy: [desc(cmvCompra.dataCompra)],
      with: { fornecedor: true, itens: true },
    });

    res.json({ ok: true, data: compras });
  });

  router.get("/:slug/compras/:id", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const compra = await db.query.cmvCompra.findFirst({
      where: and(eq(cmvCompra.id, p(req.params["id"])), eq(cmvCompra.empresaId, emp.id)),
      with: { fornecedor: true, itens: true },
    });

    if (!compra) { res.status(404).json({ ok: false, error: "Compra não encontrada" }); return; }
    res.json({ ok: true, data: compra });
  });

  router.post("/:slug/compras", requireAuth, validateBody(compraSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const { itens, ...compraData } = req.body;

    const [compra] = await db
      .insert(cmvCompra)
      .values({
        ...compraData,
        empresaId: emp.id,
        registradoPorId: userId,
        dataCompra: new Date(compraData.dataCompra),
      })
      .returning();

    if (!compra) { res.status(500).json({ ok: false, error: "Erro ao registrar compra" }); return; }

    if (itens.length > 0) {
      await db.insert(cmvCompraItem).values(
        itens.map((i: typeof itens[0]) => ({ ...i, compraId: compra.id })),
      );
    }

    /* Async: recalculate CMV + check alerts (don't block response) */
    verificarAlertasPostCompra(db, emp.id, compra.id).catch(console.error);

    res.status(201).json({ ok: true, data: compra });
  });

  router.delete("/:slug/compras/:id", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [deleted] = await db
      .delete(cmvCompra)
      .where(and(eq(cmvCompra.id, p(req.params["id"])), eq(cmvCompra.empresaId, emp.id)))
      .returning();

    if (!deleted) { res.status(404).json({ ok: false, error: "Compra não encontrada" }); return; }

    recalcularMesAtual(db, emp.id).catch(console.error);
    res.json({ ok: true, data: deleted });
  });

  /* ================================================================
     FATURAMENTO
     ================================================================ */

  router.get("/:slug/faturamento", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const registros = await db
      .select()
      .from(cmvFaturamento)
      .where(eq(cmvFaturamento.empresaId, emp.id))
      .orderBy(desc(cmvFaturamento.ano), desc(cmvFaturamento.mes));

    res.json({ ok: true, data: registros });
  });

  router.post("/:slug/faturamento", requireAuth, validateBody(faturamentoSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    /* Upsert: one record per mes/ano */
    const existing = await db
      .select({ id: cmvFaturamento.id })
      .from(cmvFaturamento)
      .where(and(eq(cmvFaturamento.empresaId, emp.id), eq(cmvFaturamento.mes, req.body.mes), eq(cmvFaturamento.ano, req.body.ano)));

    let record;
    if (existing[0]) {
      [record] = await db
        .update(cmvFaturamento)
        .set({ ...req.body, registradoPorId: userId, updatedAt: new Date() })
        .where(eq(cmvFaturamento.id, existing[0].id))
        .returning();
    } else {
      [record] = await db
        .insert(cmvFaturamento)
        .values({ ...req.body, empresaId: emp.id, registradoPorId: userId })
        .returning();
    }

    recalcularMesAtual(db, emp.id).catch(console.error);
    res.status(201).json({ ok: true, data: record });
  });

  /* ================================================================
     FORNECEDORES
     ================================================================ */

  router.get("/:slug/fornecedores", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const lista = await db
      .select()
      .from(cmvFornecedor)
      .where(and(eq(cmvFornecedor.empresaId, emp.id), eq(cmvFornecedor.ativo, true)))
      .orderBy(cmvFornecedor.nome);

    res.json({ ok: true, data: lista });
  });

  router.post("/:slug/fornecedores", requireAuth, validateBody(fornecedorSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [created] = await db.insert(cmvFornecedor).values({ ...req.body, empresaId: emp.id }).returning();
    res.status(201).json({ ok: true, data: created });
  });

  router.patch("/:slug/fornecedores/:id", requireAuth, validateBody(fornecedorSchema.partial()), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(cmvFornecedor)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(cmvFornecedor.id, p(req.params["id"])), eq(cmvFornecedor.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Fornecedor não encontrado" }); return; }
    res.json({ ok: true, data: updated });
  });

  router.delete("/:slug/fornecedores/:id", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(cmvFornecedor)
      .set({ ativo: false, updatedAt: new Date() })
      .where(and(eq(cmvFornecedor.id, p(req.params["id"])), eq(cmvFornecedor.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Fornecedor não encontrado" }); return; }
    res.json({ ok: true });
  });

  /* ================================================================
     INGREDIENTES (insumos)
     ================================================================ */

  router.get("/:slug/ingredientes", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const lista = await db
      .select()
      .from(cmvInsumo)
      .where(and(eq(cmvInsumo.empresaId, emp.id), eq(cmvInsumo.ativo, true)))
      .orderBy(cmvInsumo.nome);

    res.json({ ok: true, data: lista });
  });

  router.post("/:slug/ingredientes", requireAuth, validateBody(insumoSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [created] = await db.insert(cmvInsumo).values({ ...req.body, empresaId: emp.id }).returning();
    res.status(201).json({ ok: true, data: created });
  });

  router.patch("/:slug/ingredientes/:id", requireAuth, validateBody(insumoSchema.partial()), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(cmvInsumo)
      .set({ ...req.body, updatedAt: new Date() })
      .where(and(eq(cmvInsumo.id, p(req.params["id"])), eq(cmvInsumo.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Ingrediente não encontrado" }); return; }
    res.json({ ok: true, data: updated });
  });

  router.delete("/:slug/ingredientes/:id", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, p(req.params["slug"]), userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const [updated] = await db
      .update(cmvInsumo)
      .set({ ativo: false, updatedAt: new Date() })
      .where(and(eq(cmvInsumo.id, p(req.params["id"])), eq(cmvInsumo.empresaId, emp.id)))
      .returning();

    if (!updated) { res.status(404).json({ ok: false, error: "Ingrediente não encontrado" }); return; }
    res.json({ ok: true });
  });

  return router as unknown as RequestHandler;
}
