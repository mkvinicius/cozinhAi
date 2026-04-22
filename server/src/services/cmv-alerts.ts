import { eq, and, desc, gte, lt } from "drizzle-orm";
import type { Db } from "@cozinhai/db";
import { cmvAlerta, cmvInsumo, cmvCompraItem, cmvCompra, cmvSnapshot, empresa } from "@cozinhai/db";
import { recalcularMesAtual } from "./cmv-calculator.js";

type AlertaInput = {
  empresaId: string;
  tipo: "preco_subiu" | "cmv_acima_meta" | "estoque_critico" | "fornecedor_irregular" | "desperdicio_alto";
  severidade: "info" | "atencao" | "critico" | "urgente";
  titulo: string;
  descricao: string;
  impactoCentavos?: number;
  insumoId?: string;
  fornecedorId?: string;
};

async function inserirAlerta(db: Db, input: AlertaInput) {
  /* Avoid duplicate active alerts of the same type for same entity */
  const existing = await db
    .select({ id: cmvAlerta.id })
    .from(cmvAlerta)
    .where(
      and(
        eq(cmvAlerta.empresaId, input.empresaId),
        eq(cmvAlerta.tipo, input.tipo),
        eq(cmvAlerta.resolvido, false),
        input.insumoId ? eq(cmvAlerta.insumoId, input.insumoId) : undefined,
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(cmvAlerta).values({
    empresaId: input.empresaId,
    tipo: input.tipo,
    severidade: input.severidade,
    titulo: input.titulo,
    descricao: input.descricao,
    impactoCentavos: input.impactoCentavos ?? null,
    insumoId: input.insumoId ?? null,
    fornecedorId: input.fornecedorId ?? null,
  });
}

/* Check if price of an ingredient rose more than 10% vs last purchase */
async function checkPrecosSubiram(db: Db, empresaId: string, novaCompraId: string) {
  const itensNovos = await db
    .select()
    .from(cmvCompraItem)
    .where(eq(cmvCompraItem.compraId, novaCompraId));

  for (const item of itensNovos) {
    if (!item.insumoId) continue;

    /* Find the previous purchase item for this ingredient */
    const [anterior] = await db
      .select({ precoCentavos: cmvCompraItem.precoCentavos, compraId: cmvCompraItem.compraId })
      .from(cmvCompraItem)
      .innerJoin(cmvCompra, eq(cmvCompraItem.compraId, cmvCompra.id))
      .where(
        and(
          eq(cmvCompraItem.insumoId, item.insumoId),
          eq(cmvCompra.empresaId, empresaId),
          lt(cmvCompra.id, novaCompraId),
        ),
      )
      .orderBy(desc(cmvCompra.dataCompra))
      .limit(1);

    if (!anterior) continue;

    const variacao = (item.precoCentavos - anterior.precoCentavos) / anterior.precoCentavos;
    if (variacao > 0.1) {
      const [insumo] = await db
        .select({ nome: cmvInsumo.nome })
        .from(cmvInsumo)
        .where(eq(cmvInsumo.id, item.insumoId));

      const pctStr = (variacao * 100).toFixed(1);
      await inserirAlerta(db, {
        empresaId,
        tipo: "preco_subiu",
        severidade: variacao > 0.25 ? "critico" : "atencao",
        titulo: `Preço subiu: ${insumo?.nome ?? item.descricao}`,
        descricao: `Alta de ${pctStr}% vs. última compra (de R$ ${(anterior.precoCentavos / 100).toFixed(2)} para R$ ${(item.precoCentavos / 100).toFixed(2)}).`,
        impactoCentavos: Math.round((item.precoCentavos - anterior.precoCentavos) * 30),
        insumoId: item.insumoId,
      });
    }
  }
}

/* Check if CMV for current month exceeded the target */
async function checkCmvAcimaMeta(db: Db, empresaId: string) {
  const result = await recalcularMesAtual(db, empresaId);
  if (result.faturamentoCentavos === 0) return;

  const [emp] = await db
    .select({ metaCmvBps: empresa.metaCmvBps })
    .from(empresa)
    .where(eq(empresa.id, empresaId));

  const meta = emp?.metaCmvBps ?? 3200;
  const diff = result.actualCmvBps - meta;

  if (diff > 500) {
    await inserirAlerta(db, {
      empresaId,
      tipo: "cmv_acima_meta",
      severidade: diff > 1000 ? "urgente" : "critico",
      titulo: "CMV acima da meta",
      descricao: `CMV atual ${(result.actualCmvBps / 100).toFixed(1)}% está ${(diff / 100).toFixed(1)} pontos acima da meta de ${(meta / 100).toFixed(1)}%.`,
      impactoCentavos: Math.round((diff / 10000) * result.faturamentoCentavos),
    });
  } else if (diff > 0) {
    /* Resolve any previous urgent alert if now within 5pp */
    await db
      .update(cmvAlerta)
      .set({ resolvido: true, resolvidoEm: new Date() })
      .where(
        and(
          eq(cmvAlerta.empresaId, empresaId),
          eq(cmvAlerta.tipo, "cmv_acima_meta"),
          eq(cmvAlerta.resolvido, false),
        ),
      );
  }
}

/* Run all checks after a new purchase */
export async function verificarAlertasPostCompra(
  db: Db,
  empresaId: string,
  compraId: string,
) {
  await Promise.allSettled([
    checkPrecosSubiram(db, empresaId, compraId),
    checkCmvAcimaMeta(db, empresaId),
  ]);
}
