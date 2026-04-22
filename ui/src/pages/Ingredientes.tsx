import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, Pencil, Trash2, X, Save } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBRL } from "@/lib/utils";

type Ingrediente = {
  id: string;
  nome: string;
  categoria: string | null;
  unidade: string;
  precoReferenciaCentavos: number | null;
};

type FormState = { nome: string; categoria: string; unidade: string; precoReferenciaCentavos: string };

const CATEGORIAS = ["Carnes", "Aves", "Peixes", "Hortifruti", "Laticínios", "Secos", "Bebidas", "Embalagens", "Outros"];
const UNIDADES = ["kg", "g", "litro", "ml", "unidade", "porcao", "caixa", "pacote"];

const emptyForm = (): FormState => ({ nome: "", categoria: "Outros", unidade: "kg", precoReferenciaCentavos: "" });

function IngredienteForm({ initial, onSave, onCancel, isPending }: { initial: FormState; onSave: (d: FormState) => void; onCancel: () => void; isPending: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-orange-300 dark:border-orange-700">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
          <input autoFocus value={form.nome} onChange={set("nome")} placeholder="Ex: Filé mignon" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoria</label>
          <select value={form.categoria} onChange={set("categoria")} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Unidade</label>
          <select value={form.unidade} onChange={set("unidade")} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Preço de referência (R$/unidade)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
            <input type="number" min="0" step="0.01" value={form.precoReferenciaCentavos} onChange={set("precoReferenciaCentavos")} placeholder="0,00" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums" />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nome || isPending} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{isPending ? "Salvando..." : "Salvar"}</button>
      </div>
    </div>
  );
}

export function Ingredientes({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ["ingredientes", slug],
    queryFn: () => api.get<Ingrediente[]>(`/empresas/${slug}/ingredientes`),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => api.post(`/empresas/${slug}/ingredientes`, {
      ...data,
      precoReferenciaCentavos: data.precoReferenciaCentavos
        ? Math.round(parseFloat(data.precoReferenciaCentavos) * 100)
        : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingredientes", slug] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) =>
      api.patch(`/empresas/${slug}/ingredientes/${id}`, {
        ...data,
        precoReferenciaCentavos: data.precoReferenciaCentavos
          ? Math.round(parseFloat(data.precoReferenciaCentavos) * 100)
          : undefined,
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ingredientes", slug] }); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/empresas/${slug}/ingredientes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ingredientes", slug] }),
  });

  const categorias = [...new Set(ingredientes.map((i) => i.categoria).filter(Boolean))] as string[];
  const filtered = filtroCategoria ? ingredientes.filter((i) => i.categoria === filtroCategoria) : ingredientes;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ingredientes</h1>
            <p className="text-sm text-gray-500 mt-0.5">{ingredientes.length} cadastrados</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
            <Plus className="h-4 w-4" />Novo ingrediente
          </button>
        </div>

        {showCreate && (
          <div className="mb-4">
            <IngredienteForm initial={emptyForm()} onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowCreate(false)} isPending={createMutation.isPending} />
          </div>
        )}

        {categorias.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setFiltroCategoria("")} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!filtroCategoria ? "border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>Todos</button>
            {categorias.map((c) => (
              <button key={c} onClick={() => setFiltroCategoria(c === filtroCategoria ? "" : c)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filtroCategoria === c ? "border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700" : "border-gray-200 dark:border-gray-700 text-gray-500"}`}>{c}</button>
            ))}
          </div>
        )}

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        {filtered.length === 0 && !isLoading && !showCreate && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
            <Package className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum ingrediente cadastrado.</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filtered.map((ing) =>
            editId === ing.id ? (
              <div key={ing.id} className="p-3 border-b border-gray-100 dark:border-gray-800">
                <IngredienteForm
                  initial={{ nome: ing.nome, categoria: ing.categoria ?? "Outros", unidade: ing.unidade, precoReferenciaCentavos: ing.precoReferenciaCentavos ? String(ing.precoReferenciaCentavos / 100) : "" }}
                  onSave={(d) => updateMutation.mutate({ id: ing.id, data: d })}
                  onCancel={() => setEditId(null)}
                  isPending={updateMutation.isPending}
                />
              </div>
            ) : (
              <div key={ing.id} className="flex items-center gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ing.nome}</p>
                  <p className="text-xs text-gray-400">{ing.categoria ?? "Sem categoria"} · {ing.unidade}</p>
                </div>
                {ing.precoReferenciaCentavos && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 tabular-nums">
                    {formatBRL(ing.precoReferenciaCentavos)}/{ing.unidade}
                  </span>
                )}
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditId(ing.id)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Excluir ${ing.nome}?`)) deleteMutation.mutate(ing.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
