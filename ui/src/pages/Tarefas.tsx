import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Circle, AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: "pendente" | "em_progresso" | "aguardando" | "concluida" | "cancelada";
  prioridade: "urgente" | "alta" | "normal" | "baixa";
  createdAt: string;
};

const statusIcons: Record<Tarefa["status"], React.ComponentType<{ className?: string }>> = {
  pendente: Circle,
  em_progresso: Clock,
  aguardando: AlertCircle,
  concluida: CheckSquare,
  cancelada: Circle,
};

const statusLabels: Record<Tarefa["status"], string> = {
  pendente: "Pendente",
  em_progresso: "Em progresso",
  aguardando: "Aguardando",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const prioridadeColors: Record<Tarefa["prioridade"], string> = {
  urgente: "text-red-600 dark:text-red-400",
  alta: "text-orange-600 dark:text-orange-400",
  normal: "text-gray-500",
  baixa: "text-gray-400",
};

export function Tarefas({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [titulo, setTitulo] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: tarefas = [], isLoading } = useQuery({
    queryKey: ["tarefas", slug],
    queryFn: () => api.get<Tarefa[]>(`/empresas/${slug}/tarefas`),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post(`/empresas/${slug}/tarefas`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarefas", slug] });
      setTitulo("");
      setShowCreate(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      api.patch(`/empresas/${slug}/tarefas/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarefas", slug] }),
  });

  const active = tarefas.filter((t) => !["concluida", "cancelada"].includes(t.status));
  const done = tarefas.filter((t) => ["concluida", "cancelada"].includes(t.status));

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Tarefas</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Nova tarefa
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ titulo }); }}
            className="mb-4 flex gap-2"
          >
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa..."
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button type="submit" disabled={createMutation.isPending || !titulo} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              Criar
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </form>
        )}

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        {active.length === 0 && !isLoading && !showCreate && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8 text-center">
            <CheckSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Nenhuma tarefa ativa.</p>
          </div>
        )}

        <div className="space-y-1.5">
          {active.map((t) => {
            const Icon = statusIcons[t.status];
            return (
              <div key={t.id} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => updateMutation.mutate({ id: t.id, data: { status: t.status === "pendente" ? "concluida" : "pendente" } })}
                  className="mt-0.5"
                >
                  <Icon className={cn("h-4 w-4", t.status === "concluida" ? "text-green-500" : "text-gray-400")} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-gray-100">{t.titulo}</p>
                  {t.descricao && <p className="text-xs text-gray-500 mt-0.5">{t.descricao}</p>}
                </div>
                <span className={cn("text-xs font-medium", prioridadeColors[t.prioridade])}>
                  {t.prioridade}
                </span>
              </div>
            );
          })}
        </div>

        {done.length > 0 && (
          <details className="mt-6">
            <summary className="text-xs font-medium text-gray-400 cursor-pointer select-none mb-2">
              Concluídas ({done.length})
            </summary>
            <div className="space-y-1.5 mt-2">
              {done.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 opacity-60">
                  <CheckSquare className="h-4 w-4 text-green-500 shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-through">{t.titulo}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
