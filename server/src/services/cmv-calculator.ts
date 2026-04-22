import { eq, and, gte, lte, sum } from "drizzle-orm";
import type { Db } from "@cozinhai/db";
import { empresa, cmvCompra, cmvFaturamento, cmvSnapshot } from "@cozinhai/db";

export type CmvStatus = "otimo" | "bom" | "atencao" | "critico" | "sem_dados";

export type CmvResult = {
  mes: number;
  ano: number;
  periodo: string;
  custoMercadoriaCentavos: number;
  faturamentoCentavos: number;
  actualCmvBps: number;
  theoreticalCmvBps: number;
  diffBps: number;
  status: CmvStatus;
  totalCompras: number;
  ticketMedioCentavos: number | null;
};

function periodoLabel(mes: number, ano: number): string {
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[(mes - 1) % 12]}/${ano}`;
}

function cmvStatus(actualBps: number, metaBps: number): CmvStatus {
  const diff = actualBps - metaBps;
  if (diff < -300) return "otimo";
  if (diff <= 0) return "bom";
  if (diff <= 500) return "atencao";
  return "critico";
}

export async function calcularCmv(
  db: Db,
  empresaId: string,
  mes: number,
  ano: number,
): Promise<CmvResult> {
  /* Date range for month */
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);

  /* Fetch empresa meta */
  const [emp] = await db.select({ metaCmvBps: empresa.metaCmvBps }).from(empresa).where(eq(empresa.id, empresaId));
  const metaBps = emp?.metaCmvBps ?? 3200;

  /* Sum purchases for the month */
  const [custoRow] = await db
    .select({ total: sum(cmvCompra.totalCentavos) })
    .from(cmvCompra)
    .where(and(eq(cmvCompra.empresaId, empresaId), gte(cmvCompra.dataCompra, inicio), lte(cmvCompra.dataCompra, fim)));

  const custoMercadoriaCentavos = Number(custoRow?.total ?? 0);

  /* Count purchases */
  const compras = await db
    .select({ id: cmvCompra.id })
    .from(cmvCompra)
    .where(and(eq(cmvCompra.empresaId, empresaId), gte(cmvCompra.dataCompra, inicio), lte(cmvCompra.dataCompra, fim)));
  const totalCompras = compras.length;

  /* Fetch faturamento */
  const [fat] = await db
    .select()
    .from(cmvFaturamento)
    .where(and(eq(cmvFaturamento.empresaId, empresaId), eq(cmvFaturamento.mes, mes), eq(cmvFaturamento.ano, ano)));

  const faturamentoCentavos = fat ? Number(fat.faturamentoCentavos) : 0;
  const totalClientes = fat?.totalClientes ?? null;

  /* Calculate CMV */
  const actualCmvBps =
    faturamentoCentavos > 0
      ? Math.round((custoMercadoriaCentavos / faturamentoCentavos) * 10000)
      : 0;

  const ticketMedioCentavos =
    totalClientes && totalClientes > 0 && faturamentoCentavos > 0
      ? Math.round(faturamentoCentavos / totalClientes)
      : null;

  const periodo = periodoLabel(mes, ano);
  const status: CmvStatus = faturamentoCentavos === 0 ? "sem_dados" : cmvStatus(actualCmvBps, metaBps);

  /* Upsert snapshot */
  if (faturamentoCentavos > 0) {
    const existing = await db
      .select({ id: cmvSnapshot.id })
      .from(cmvSnapshot)
      .where(and(eq(cmvSnapshot.empresaId, empresaId), eq(cmvSnapshot.periodo, periodo)));

    const snapshotData = {
      empresaId,
      periodo,
      dataInicio: inicio,
      dataFim: fim,
      faturamentoCentavos,
      custoMercadoriaCentavos,
      actualCmvBps,
      theoreticalCmvBps: metaBps,
      ticketMedioCentavos,
      totalVendas: totalClientes,
    };

    if (existing[0]) {
      await db.update(cmvSnapshot).set(snapshotData).where(eq(cmvSnapshot.id, existing[0].id));
    } else {
      await db.insert(cmvSnapshot).values(snapshotData);
    }
  }

  return {
    mes,
    ano,
    periodo,
    custoMercadoriaCentavos,
    faturamentoCentavos,
    actualCmvBps,
    theoreticalCmvBps: metaBps,
    diffBps: actualCmvBps - metaBps,
    status,
    totalCompras,
    ticketMedioCentavos,
  };
}

/* Recalculate after any purchase or faturamento change */
export async function recalcularMesAtual(db: Db, empresaId: string) {
  const now = new Date();
  return calcularCmv(db, empresaId, now.getMonth() + 1, now.getFullYear());
}
