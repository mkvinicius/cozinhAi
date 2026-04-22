import { useQuery } from "@tanstack/react-query";
import { Bot, Play, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Agente = {
  id: string;
  slug: string;
  nome: string;
  papel: string;
  ativo: boolean;
  llmProvedor: string | null;
};

const provedorColors: Record<string, string> = {
  claude: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  gemini: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  openai: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
};

export function Agentes({ slug }: { slug: string }) {
  const { data: agentes = [], isLoading } = useQuery({
    queryKey: ["agentes", slug],
    queryFn: () => api.get<Agente[]>(`/empresas/${slug}/agentes`),
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Agentes</h1>
            <p className="text-sm text-gray-500 mt-0.5">Equipe de IA do seu restaurante</p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        {agentes.length === 0 && !isLoading && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
            <Bot className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Nenhum agente configurado</p>
            <p className="text-sm text-gray-500 mt-1">Os agentes são criados automaticamente durante o onboarding.</p>
          </div>
        )}

        <div className="space-y-3">
          {agentes.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-4"
            >
              <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <Bot className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{a.nome}</span>
                  {a.llmProvedor && (
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", provedorColors[a.llmProvedor] ?? "bg-gray-100 text-gray-600")}>
                      {a.llmProvedor}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{a.papel}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded" title="Histórico">
                  <Clock className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-gray-400 hover:text-orange-600 rounded" title="Executar">
                  <Play className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
