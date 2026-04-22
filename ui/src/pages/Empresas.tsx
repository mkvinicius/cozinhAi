import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChefHat, Plus, Building2 } from "lucide-react";
import { api } from "@/lib/api-client";

type Empresa = {
  id: string;
  slug: string;
  nome: string;
  tipo: string;
  cidade: string | null;
  estado: string | null;
  metaCmvBps: number;
};

export function Empresas() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [slug, setSlug] = useState("");
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [metaCmv, setMetaCmv] = useState("32");

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: () => api.get<Empresa[]>("/empresas"),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => api.post<Empresa>("/empresas", data),
    onSuccess: (empresa) => {
      qc.invalidateQueries({ queryKey: ["empresas"] });
      setShowCreate(false);
      navigate(`/${empresa.slug}/dashboard`);
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      slug: slug.toLowerCase().replace(/\s+/g, "-"),
      nome,
      cidade: cidade || undefined,
      metaCmvBps: Math.round(parseFloat(metaCmv) * 100),
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <ChefHat className="h-7 w-7 text-orange-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Suas Empresas</h1>
            <p className="text-sm text-gray-500">Selecione ou crie um restaurante</p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        <div className="space-y-3 mb-6">
          {empresas.map((emp) => (
            <button
              key={emp.id}
              onClick={() => navigate(`/${emp.slug}/dashboard`)}
              className="w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors text-left"
            >
              <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">{emp.nome}</p>
                <p className="text-xs text-gray-500">
                  {emp.cidade && `${emp.cidade}, `}{emp.estado} · Meta CMV: {(emp.metaCmvBps / 100).toFixed(0)}%
                </p>
              </div>
            </button>
          ))}
        </div>

        {!showCreate ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="h-4 w-4" />
            Adicionar restaurante
          </button>
        ) : (
          <form onSubmit={handleCreate} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
            <h2 className="font-medium text-gray-900 dark:text-gray-100">Novo Restaurante</h2>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: Sabor da Vovó" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug (URL)</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} required placeholder="sabor-da-vovo" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Cidade</label>
              <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="São Paulo" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Meta de CMV (%)</label>
              <input type="number" value={metaCmv} onChange={(e) => setMetaCmv(e.target.value)} min="5" max="80" step="0.5" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            {createMutation.error && (
              <p className="text-sm text-red-600">{createMutation.error.message}</p>
            )}

            <div className="flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {createMutation.isPending ? "Criando..." : "Criar restaurante"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
