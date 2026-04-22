import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingDown, TrendingUp, DollarSign, ShoppingCart,
  AlertTriangle, ChefHat, CheckCircle2, ArrowUp, ArrowDown,
  Minus, Edit3, X, Loader2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api-client";
import { formatBRL, formatPct, cn } from "@/lib/utils";

/* ---- types ---- */

type CmvResult = {
  mes: number;
  ano: number;
  periodo: string;
  custoMercadoriaCentavos: number;
  faturamentoCentavos: number;
  actualCmvBps: number;
  theoreticalCmvBps: number;
  diffBps: number;
  status: "otimo" | "bom" | "atencao" | "critico" | "sem_dados";
  totalCompras: number;
  ticketMedioCentavos: number | null;
};

type Snapshot = {
  periodo: string;
  actualCmvBps: number;
  theoreticalCmvBps: number;
  faturamentoCentavos: number;
  dataInicio: string;
};

type Alerta = {
  id: string;
  tipo: string;
  severidade: "info" | "atencao" | "critico" | "urgente";
  titulo: string;
  descricao: string;
  impactoCentavos: number | null;
  createdAt: string;
};

/* ---- helpers ---- */

const STATUS_COLORS = {
  otimo: { badge: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300", value: "text-green-600 dark:text-green-400" },
  bom: { badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", value: "text-blue-600 dark:text-blue-400" },
  atencao: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300", value: "text-amber-600 dark:text-amber-400" },
  critico: { badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", value: "text-red-600 dark:text-red-400" },
  sem_dados: { badge: "bg-gray-100 text-gray-600", value: "text-gray-400" },
};

const STATUS_LABELS = { otimo: "Ótimo", bom: "Bom", atencao: "Atenção", critico: "Crítico", sem_dados: "Sem dados" };

const ALERTA_COLORS: Record<Alerta["severidade"], string> = {
  info: "text-blue-500",
  atencao: "text-amber-500",
  critico: "text-orange-500",
  urgente: "text-red-500",
};

/* ---- Modal de Faturamento ---- */

function FaturamentoModal({ slug, mes, ano, onClose }: { slug: string; mes: number; ano: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [valor, setValor] = useState("");
  const [clientes, setClientes] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post(`/empresas/${slug}/faturamento`, {
      mes,
      ano,
      faturamentoCentavos: Math.round(parseFloat(valor.replace(",", ".")) * 100),
      totalClientes: clientes ? parseInt(clientes) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cmv", slug] });
      qc.invalidateQueries({ queryKey: ["cmv-historico", slug] });
      onClose();
    },
  });

  const nomes = ["", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const ticketCalculado = valor && clientes
    ? Math.round(parseFloat(valor.replace(",", ".")) * 100 / parseInt(clientes))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">
            Faturamento — {nomes[mes]}/{ano}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Valor faturado (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
              <input
                autoFocus
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Número de clientes (opcional)</label>
            <input
              type="number"
              min="0"
              value={clientes}
              onChange={(e) => setClientes(e.target.value)}
              placeholder="Ex: 850"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {ticketCalculado && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Ticket médio calculado</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{formatBRL(ticketCalculado)}</p>
            </div>
          )}

          {mutation.error && (
            <p className="text-xs text-red-600">{mutation.error.message}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 dark:border-gray-700 rounded-lg">
              Cancelar
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={!valor || mutation.isPending}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- main component ---- */

export function CmvDashboard({ slug }: { slug: string }) {
  const [showFaturamento, setShowFaturamento] = useState(false);
  const qc = useQueryClient();
  const now = new Date();

  const { data: cmv, isLoading } = useQuery({
    queryKey: ["cmv", slug],
    queryFn: () => api.get<CmvResult>(`/empresas/${slug}/cmv`),
  });

  const { data: historico = [] } = useQuery({
    queryKey: ["cmv-historico", slug],
    queryFn: () => api.get<Snapshot[]>(`/empresas/${slug}/cmv/historico`),
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ["cmv-alertas", slug],
    queryFn: () => api.get<Alerta[]>(`/empresas/${slug}/cmv/alertas`),
  });

  const resolverMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/empresas/${slug}/cmv/alertas/${id}/resolver`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cmv-alertas", slug] }),
  });

  const colors = cmv ? STATUS_COLORS[cmv.status] : STATUS_COLORS.sem_dados;
  const diffAbs = cmv ? Math.abs(cmv.diffBps) : 0;
  const diffSign = cmv ? (cmv.diffBps > 0 ? "+" : cmv.diffBps < 0 ? "-" : "") : "";
  const DiffIcon = cmv
    ? cmv.diffBps > 0 ? ArrowUp : cmv.diffBps < 0 ? ArrowDown : Minus
    : Minus;

  /* chart data */
  const chartData = historico.map((s) => ({
    periodo: s.periodo,
    cmv: parseFloat((s.actualCmvBps / 100).toFixed(1)),
    meta: parseFloat((s.theoreticalCmvBps / 100).toFixed(1)),
  }));

  const metaBps = cmv?.theoreticalCmvBps ?? 3200;

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <ChefHat className="h-5 w-5 text-gray-400" />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gestão de CMV</h1>
        {cmv && (
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", colors.badge)}>
            {STATUS_LABELS[cmv.status]}
          </span>
        )}
      </div>

      <div className="p-6 max-w-5xl mx-auto space-y-8">

        {/* Painel principal — CMV hero card */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : cmv ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* CMV grande */}
            <div className={cn("col-span-1 rounded-2xl border p-6 flex flex-col gap-2",
              cmv.status === "critico" ? "border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30"
              : cmv.status === "atencao" ? "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30"
              : "border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30"
            )}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">CMV do Mês</p>
              <p className={cn("text-5xl font-bold", colors.value)}>
                {cmv.faturamentoCentavos > 0 ? formatPct(cmv.actualCmvBps) : "—"}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <DiffIcon className={cn("h-3.5 w-3.5", cmv.diffBps > 0 ? "text-red-500" : cmv.diffBps < 0 ? "text-green-500" : "text-gray-400")} />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {cmv.faturamentoCentavos > 0
                    ? `${diffSign}${(diffAbs / 100).toFixed(1)}pp vs. meta de ${formatPct(metaBps)}`
                    : `Meta: ${formatPct(metaBps)}`}
                </span>
              </div>
              {cmv.faturamentoCentavos === 0 && (
                <button
                  onClick={() => setShowFaturamento(true)}
                  className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-medium text-left"
                >
                  + Registrar faturamento do mês
                </button>
              )}
            </div>

            {/* Grid de métricas */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {[
                {
                  icon: DollarSign,
                  label: "Custo total de compras",
                  value: formatBRL(cmv.custoMercadoriaCentavos),
                  sub: `${cmv.totalCompras} NFs`,
                },
                {
                  icon: TrendingUp,
                  label: "Faturamento",
                  value: cmv.faturamentoCentavos > 0 ? formatBRL(cmv.faturamentoCentavos) : "Não informado",
                  sub: "Mês atual",
                  action: { label: "Editar", fn: () => setShowFaturamento(true) },
                },
                {
                  icon: TrendingDown,
                  label: "Margem bruta estimada",
                  value: cmv.faturamentoCentavos > 0 ? formatPct(10000 - cmv.actualCmvBps) : "—",
                  sub: "Após custo de mercadoria",
                },
                {
                  icon: ShoppingCart,
                  label: "Ticket médio",
                  value: cmv.ticketMedioCentavos ? formatBRL(cmv.ticketMedioCentavos) : "—",
                  sub: "Por cliente",
                },
              ].map((card) => (
                <div key={card.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <card.icon className="h-4 w-4 text-gray-400" />
                      <span className="text-xs text-gray-500">{card.label}</span>
                    </div>
                    {card.action && (
                      <button onClick={card.action.fn} className="text-gray-400 hover:text-orange-600 transition-colors">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
            <ChefHat className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Configure seu CMV</p>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              Registre as primeiras notas fiscais de compra para começar.
            </p>
          </div>
        )}

        {/* Gráfico histórico */}
        {chartData.length > 0 && (
          <section>
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Histórico CMV</h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={["dataMin - 2", "dataMax + 2"]}
                  />
                  <Tooltip
                    formatter={(val: number, name: string) => [`${val.toFixed(1)}%`, name === "cmv" ? "CMV" : "Meta"]}
                    labelStyle={{ fontSize: 12 }}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <ReferenceLine y={metaBps / 100} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Meta", fontSize: 10, fill: "#ef4444" }} />
                  <Line type="monotone" dataKey="cmv" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="CMV" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Alertas */}
        <section>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
            Alertas Ativos {alertas.length > 0 && <span className="text-red-500">({alertas.length})</span>}
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
                <p className="text-sm text-gray-500">Nenhum alerta ativo. Tudo dentro da meta.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {alertas.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <AlertTriangle className={cn("h-4 w-4 mt-0.5 shrink-0", ALERTA_COLORS[a.severidade])} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.descricao}</p>
                      {a.impactoCentavos && (
                        <p className="text-xs text-gray-400 mt-1">
                          Impacto estimado: {formatBRL(a.impactoCentavos)}/mês
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => resolverMutation.mutate(a.id)}
                      className="shrink-0 text-xs text-gray-400 hover:text-green-600 border border-gray-200 dark:border-gray-700 px-2 py-1 rounded transition-colors"
                    >
                      Resolver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showFaturamento && cmv && (
        <FaturamentoModal
          slug={slug}
          mes={cmv.mes ?? now.getMonth() + 1}
          ano={cmv.ano ?? now.getFullYear()}
          onClose={() => setShowFaturamento(false)}
        />
      )}
    </div>
  );
}
