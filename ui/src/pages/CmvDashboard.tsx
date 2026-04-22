import { useQuery } from "@tanstack/react-query";
import { ChefHat, TrendingDown, TrendingUp, DollarSign, AlertTriangle, Truck, Plus } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBRL, formatPct, cn } from "@/lib/utils";

type Snapshot = {
  actualCmvBps: number;
  theoreticalCmvBps: number;
  faturamentoCentavos: number;
  ticketMedioCentavos: number | null;
  totalVendas: number | null;
};

type Alerta = {
  id: string;
  tipo: string;
  severidade: "info" | "atencao" | "critico" | "urgente";
  titulo: string;
  descricao: string;
  impactoCentavos: number | null;
};

type Fornecedor = {
  id: string;
  nome: string;
};

type TrendPoint = {
  periodo: string;
  actualCmvBps: number;
};

const severidadeColors: Record<Alerta["severidade"], string> = {
  info: "text-blue-500",
  atencao: "text-amber-500",
  critico: "text-orange-500",
  urgente: "text-red-500",
};

export function CmvDashboard({ slug }: { slug: string }) {
  const { data: snapshot } = useQuery({
    queryKey: ["cmv", "snapshot", slug],
    queryFn: () => api.get<Snapshot | null>(`/empresas/${slug}/cmv/snapshot`),
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ["cmv", "alertas", slug],
    queryFn: () => api.get<Alerta[]>(`/empresas/${slug}/cmv/alertas`),
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ["cmv", "fornecedores", slug],
    queryFn: () => api.get<Fornecedor[]>(`/empresas/${slug}/cmv/fornecedores`),
  });

  const { data: tendencia = [] } = useQuery({
    queryKey: ["cmv", "tendencia", slug],
    queryFn: () => api.get<TrendPoint[]>(`/empresas/${slug}/cmv/tendencia`),
  });

  const hasData = snapshot !== null && snapshot !== undefined;
  const diffBps = hasData ? snapshot.actualCmvBps - snapshot.theoreticalCmvBps : 0;
  const statusLabel = diffBps <= 0 ? "OK" : diffBps <= 200 ? "Atenção" : "Alerta";
  const statusColor = diffBps <= 0
    ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
    : diffBps <= 200
    ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
    : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <ChefHat className="h-5 w-5 text-gray-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gestão de CMV</h1>
        {hasData && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColor)}>
            {statusLabel}
          </span>
        )}
        <div className="ml-auto">
          <button className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
            <Plus className="h-4 w-4" />
            Registrar NF
          </button>
        </div>
      </div>

      <div className="p-6 space-y-8 max-w-5xl mx-auto">
        {/* Saúde Financeira */}
        <section>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Saúde Financeira
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: TrendingDown,
                label: "CMV Atual",
                value: hasData ? formatPct(snapshot.actualCmvBps) : "—",
                sub: hasData ? `Meta: ${formatPct(snapshot.theoreticalCmvBps)}` : "Sem dados",
                highlight: hasData && diffBps > 0,
              },
              {
                icon: TrendingUp,
                label: "Margem Bruta",
                value: hasData ? formatPct(10000 - snapshot.actualCmvBps) : "—",
                sub: "Estimada",
                highlight: false,
              },
              {
                icon: DollarSign,
                label: "Ticket Médio",
                value: hasData && snapshot.ticketMedioCentavos ? formatBRL(snapshot.ticketMedioCentavos) : "—",
                sub: "Período atual",
                highlight: false,
              },
              {
                icon: ChefHat,
                label: "Faturamento",
                value: hasData ? formatBRL(snapshot.faturamentoCentavos) : "—",
                sub: "Período atual",
                highlight: false,
              },
            ].map((card) => (
              <div
                key={card.label}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-xl border p-4",
                  card.highlight
                    ? "border-orange-300 dark:border-orange-700"
                    : "border-gray-200 dark:border-gray-800",
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <card.icon className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {card.label}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-2xl font-bold",
                    card.highlight
                      ? "text-orange-600 dark:text-orange-400"
                      : "text-gray-900 dark:text-gray-100",
                  )}
                >
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Alertas */}
        <section>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Alertas
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertTriangle className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">Nenhum alerta ativo. Tudo dentro da meta.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {alertas.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", severidadeColors[a.severidade])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.descricao}</p>
                      {a.impactoCentavos && (
                        <p className="text-xs text-gray-400 mt-1">Impacto: {formatBRL(a.impactoCentavos)}/mês</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Fornecedores */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Fornecedores ({fornecedores.length})
            </h2>
            <button className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              + Adicionar
            </button>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {fornecedores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Truck className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500">
                  Nenhum fornecedor cadastrado. Registre sua primeira NF para começar.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {fornecedores.map((f) => (
                  <div key={f.id} className="flex items-center px-4 py-2.5">
                    <span className="text-sm text-gray-900 dark:text-gray-100">{f.nome}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Tendência */}
        {tendencia.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Tendência CMV
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-end gap-1 h-24">
                {tendencia.map((p, i) => {
                  const max = Math.max(...tendencia.map((t) => t.actualCmvBps));
                  const height = Math.round((p.actualCmvBps / (max * 1.2)) * 100);
                  const over = hasData && p.actualCmvBps > snapshot.theoreticalCmvBps;
                  return (
                    <div key={i} className="flex-1" title={`${p.periodo}: ${formatPct(p.actualCmvBps)}`}>
                      <div
                        className={cn("w-full rounded-t-sm", over ? "bg-orange-400" : "bg-gray-200 dark:bg-gray-700")}
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex mt-2 gap-1">
                {tendencia.map((p, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-[9px] text-gray-400">{p.periodo.slice(-5)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Getting started */}
        {!hasData && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <ChefHat className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">Configure seu sistema de CMV</p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Registre suas primeiras notas fiscais de compra e os agentes vão calcular automaticamente seu CMV, ponto de equilíbrio e primeiro briefing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
