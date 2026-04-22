import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ShoppingCart, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBRL, cn } from "@/lib/utils";

type Compra = {
  id: string;
  dataCompra: string;
  totalCentavos: number;
  numeroNf: string | null;
  observacoes: string | null;
  fornecedor: { id: string; nome: string } | null;
  itens: {
    id: string;
    descricao: string;
    quantidade: number;
    unidade: string;
    precoCentavos: number;
    totalCentavos: number;
  }[];
};

export function Compras({ slug }: { slug: string }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: compras = [], isLoading } = useQuery({
    queryKey: ["compras", slug],
    queryFn: () => api.get<Compra[]>(`/empresas/${slug}/compras`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/empresas/${slug}/compras/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compras", slug] }),
  });

  const totalMes = compras
    .filter((c) => {
      const d = new Date(c.dataCompra);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, c) => s + c.totalCentavos, 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Compras</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Mês atual: <span className="font-medium text-gray-700 dark:text-gray-300">{formatBRL(totalMes)}</span>
            </p>
          </div>
          <button
            onClick={() => navigate(`/${slug}/compras/nova`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            Nova Compra
          </button>
        </div>

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        {compras.length === 0 && !isLoading && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
            <ShoppingCart className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-medium text-gray-900 dark:text-gray-100">Nenhuma compra registrada</p>
            <p className="text-sm text-gray-500 mt-1">Registre sua primeira nota fiscal para calcular o CMV.</p>
            <button
              onClick={() => navigate(`/${slug}/compras/nova`)}
              className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              + Registrar primeira NF
            </button>
          </div>
        )}

        {/* Table */}
        {compras.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
              <span />
              <span>Fornecedor</span>
              <span>Data</span>
              <span>Itens</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {compras.map((c) => {
                const expanded = expandedId === c.id;
                return (
                  <div key={c.id}>
                    <div
                      className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                    >
                      <div className="text-gray-400">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {c.fornecedor?.nome ?? "Sem fornecedor"}
                        </p>
                        {c.numeroNf && <p className="text-xs text-gray-400">NF {c.numeroNf}</p>}
                      </div>
                      <span className="text-sm text-gray-500 tabular-nums">
                        {new Date(c.dataCompra).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-sm text-gray-500 tabular-nums text-center">
                        {c.itens.length} {c.itens.length === 1 ? "item" : "itens"}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 tabular-nums text-right">
                        {formatBRL(c.totalCentavos)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (confirm("Excluir esta compra?")) deleteMutation.mutate(c.id); }}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-3 bg-gray-50 dark:bg-gray-800/50">
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-1.5 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                            <span>Ingrediente</span>
                            <span className="text-center">Qtd</span>
                            <span className="text-center">Preço unit.</span>
                            <span className="text-right">Total</span>
                          </div>
                          {c.itens.map((item) => (
                            <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr] px-3 py-2 text-sm bg-white dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800 last:border-0">
                              <span className="text-gray-800 dark:text-gray-200">{item.descricao}</span>
                              <span className="text-center text-gray-500 tabular-nums">{item.quantidade} {item.unidade}</span>
                              <span className="text-center text-gray-500 tabular-nums">{formatBRL(item.precoCentavos)}</span>
                              <span className="text-right font-medium text-gray-800 dark:text-gray-200 tabular-nums">{formatBRL(item.totalCentavos)}</span>
                            </div>
                          ))}
                        </div>
                        {c.observacoes && (
                          <p className="text-xs text-gray-500 mt-2 italic">{c.observacoes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
