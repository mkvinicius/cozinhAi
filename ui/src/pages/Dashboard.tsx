import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, DollarSign, AlertTriangle, ChefHat } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBRL, formatPct, cn } from "@/lib/utils";

type Snapshot = {
  actualCmvBps: number;
  theoreticalCmvBps: number;
  faturamentoCentavos: number;
  ticketMedioCentavos: number | null;
};

type Alerta = {
  id: string;
  severidade: "info" | "atencao" | "critico" | "urgente";
  titulo: string;
  descricao: string;
  impactoCentavos: number | null;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent?: "ok" | "warn" | "danger";
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p
        className={cn(
          "text-2xl font-bold",
          accent === "ok" && "text-green-600 dark:text-green-400",
          accent === "warn" && "text-amber-600 dark:text-amber-400",
          accent === "danger" && "text-red-600 dark:text-red-400",
          !accent && "text-gray-900 dark:text-gray-100",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export function Dashboard({ slug }: { slug: string }) {
  const { data: snapshot } = useQuery({
    queryKey: ["cmv", "snapshot", slug],
    queryFn: () => api.get<Snapshot | null>(`/empresas/${slug}/cmv/snapshot`),
  });

  const { data: alertas = [] } = useQuery({
    queryKey: ["cmv", "alertas", slug],
    queryFn: () => api.get<Alerta[]>(`/empresas/${slug}/cmv/alertas`),
  });

  const diffBps = snapshot ? snapshot.actualCmvBps - snapshot.theoreticalCmvBps : 0;
  const accent = diffBps <= 0 ? "ok" : diffBps <= 200 ? "warn" : "danger";

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do seu restaurante</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            icon={TrendingDown}
            label="CMV atual"
            value={snapshot ? formatPct(snapshot.actualCmvBps) : "—"}
            sub={snapshot ? `Meta: ${formatPct(snapshot.theoreticalCmvBps)}` : "Sem dados"}
            accent={snapshot ? accent : undefined}
          />
          <MetricCard
            icon={TrendingUp}
            label="Margem bruta"
            value={snapshot ? formatPct(10000 - snapshot.actualCmvBps) : "—"}
            sub="Estimada"
          />
          <MetricCard
            icon={DollarSign}
            label="Faturamento"
            value={snapshot ? formatBRL(snapshot.faturamentoCentavos) : "—"}
            sub="Período atual"
          />
          <MetricCard
            icon={AlertTriangle}
            label="Alertas ativos"
            value={String(alertas.length)}
            accent={alertas.length > 0 ? "warn" : "ok"}
          />
        </div>

        {/* Alertas */}
        {alertas.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              Alertas
            </h2>
            <div className="space-y-2">
              {alertas.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4 mt-0.5 shrink-0",
                      a.severidade === "urgente" && "text-red-500",
                      a.severidade === "critico" && "text-orange-500",
                      a.severidade === "atencao" && "text-amber-500",
                      a.severidade === "info" && "text-blue-500",
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{a.descricao}</p>
                    {a.impactoCentavos && (
                      <p className="text-xs text-gray-400 mt-1">
                        Impacto: {formatBRL(a.impactoCentavos)}/mês
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Getting started */}
        {!snapshot && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <ChefHat className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              Configure seu CMV
            </p>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Registre suas primeiras notas fiscais de compra para começar a calcular seu CMV automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
