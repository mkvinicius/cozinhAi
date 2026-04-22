import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { empresa, membro, cmvSnapshot, cmvFornecedor, cmvInsumo, cmvCompra, cmvCompraItem, cmvAlerta } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

async function resolveEmpresa(db: Db, slug: string, userId: string) {
  const [emp] = await db.select().from(empresa).where(eq(empresa.slug, slug));
  if (!emp) return null;
  const [mem] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, userId)));
  return mem ? emp : null;
}

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
      quantidade: z.number().int().positive(),
      unidade: z.enum(["kg", "g", "litro", "ml", "unidade", "porcao", "caixa", "pacote"]),
      precoCentavos: z.number().int().positive(),
      totalCentavos: z.number().int().positive(),
    }),
  ),
});

export function cmvRoutes(db: Db) {
  const router = Router();

  /* --- Dashboard snapshot --- */
  router.get("/:slug/cmv/snapshot", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada ou acesso negado" }); return; }

    const [latest] = await db
      .select()
      .from(cmvSnapshot)
      .where(eq(cmvSnapshot.empresaId, emp.id))
      .orderBy(desc(cmvSnapshot.createdAt))
      .limit(1);

    res.json({ ok: true, data: latest ?? null });
  });

  /* --- Alertas --- */
  router.get("/:slug/cmv/alertas", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const alertas = await db
      .select()
      .from(cmvAlerta)
      .where(and(eq(cmvAlerta.empresaId, emp.id), eq(cmvAlerta.resolvido, false)))
      .orderBy(desc(cmvAlerta.createdAt));

    res.json({ ok: true, data: alertas });
  });

  /* --- Fornecedores --- */
  router.get("/:slug/cmv/fornecedores", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const fornecedores = await db
      .select()
      .from(cmvFornecedor)
      .where(and(eq(cmvFornecedor.empresaId, emp.id), eq(cmvFornecedor.ativo, true)))
      .orderBy(cmvFornecedor.nome);

    res.json({ ok: true, data: fornecedores });
  });

  router.post(
    "/:slug/cmv/fornecedores",
    requireAuth,
    validateBody(z.object({ nome: z.string().min(2), cnpj: z.string().optional(), contato: z.string().optional(), email: z.string().email().optional(), telefone: z.string().optional() })),
    async (req, res) => {
      const userId = req.actor.type === "user" ? req.actor.userId : "";
      const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
      if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

      const [created] = await db.insert(cmvFornecedor).values({ ...req.body, empresaId: emp.id }).returning();
      res.status(201).json({ ok: true, data: created });
    },
  );

  /* --- Insumos --- */
  router.get("/:slug/cmv/insumos", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const insumos = await db
      .select()
      .from(cmvInsumo)
      .where(and(eq(cmvInsumo.empresaId, emp.id), eq(cmvInsumo.ativo, true)))
      .orderBy(cmvInsumo.nome);

    res.json({ ok: true, data: insumos });
  });

  /* --- Compras (NF) --- */
  router.get("/:slug/cmv/compras", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const compras = await db.query.cmvCompra.findMany({
      where: eq(cmvCompra.empresaId, emp.id),
      orderBy: [desc(cmvCompra.dataCompra)],
      with: { fornecedor: true, itens: true },
    });

    res.json({ ok: true, data: compras });
  });

  router.post("/:slug/cmv/compras", requireAuth, validateBody(compraSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const { itens, ...compraData } = req.body;

    const [compra] = await db
      .insert(cmvCompra)
      .values({ ...compraData, empresaId: emp.id, registradoPorId: userId, dataCompra: new Date(compraData.dataCompra) })
      .returning();

    if (!compra) { res.status(500).json({ ok: false, error: "Erro ao registrar compra" }); return; }

    if (itens.length > 0) {
      await db.insert(cmvCompraItem).values(itens.map((i: typeof itens[0]) => ({ ...i, compraId: compra.id })));
    }

    res.status(201).json({ ok: true, data: compra });
  });

  /* --- Tendência histórica --- */
  router.get("/:slug/cmv/tendencia", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : "";
    const emp = await resolveEmpresa(db, req.params["slug"] ?? "", userId);
    if (!emp) { res.status(404).json({ ok: false, error: "Acesso negado" }); return; }

    const snapshots = await db
      .select()
      .from(cmvSnapshot)
      .where(eq(cmvSnapshot.empresaId, emp.id))
      .orderBy(desc(cmvSnapshot.dataInicio))
      .limit(12);

    res.json({ ok: true, data: snapshots.reverse() });
  });

  return router;
}
