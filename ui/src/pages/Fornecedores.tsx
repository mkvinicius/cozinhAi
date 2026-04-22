import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Truck, Phone, Mail, Pencil, Trash2, X, Save } from "lucide-react";
import { api } from "@/lib/api-client";

type Fornecedor = {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
};

type FormState = { nome: string; cnpj: string; contato: string; email: string; telefone: string; observacoes: string };

const emptyForm = (): FormState => ({ nome: "", cnpj: "", contato: "", email: "", telefone: "", observacoes: "" });

function FornecedorForm({
  initial,
  onSave,
  onCancel,
  isPending,
}: {
  initial: FormState;
  onSave: (data: FormState) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-orange-300 dark:border-orange-700">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
          <input autoFocus value={form.nome} onChange={set("nome")} placeholder="Ex: Frigorífico Bom Gosto" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CNPJ</label>
          <input value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0000-00" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Contato</label>
          <input value={form.contato} onChange={set("contato")} placeholder="Nome do vendedor" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone</label>
          <input value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-9999" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">E-mail</label>
          <input value={form.email} onChange={set("email")} placeholder="vendas@fornecedor.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
          <textarea rows={2} value={form.observacoes} onChange={set("observacoes")} placeholder="Ex: Entrega toda terça e quinta..." className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><X className="h-3.5 w-3.5" />Cancelar</button>
        <button onClick={() => onSave(form)} disabled={!form.nome || isPending} className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-1.5"><Save className="h-3.5 w-3.5" />{isPending ? "Salvando..." : "Salvar"}</button>
      </div>
    </div>
  );
}

export function Fornecedores({ slug }: { slug: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { data: fornecedores = [], isLoading } = useQuery({
    queryKey: ["fornecedores", slug],
    queryFn: () => api.get<Fornecedor[]>(`/empresas/${slug}/fornecedores`),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => api.post(`/empresas/${slug}/fornecedores`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fornecedores", slug] }); setShowCreate(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormState }) => api.patch(`/empresas/${slug}/fornecedores/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fornecedores", slug] }); setEditId(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/empresas/${slug}/fornecedores/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores", slug] }),
  });

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Fornecedores</h1>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium">
            <Plus className="h-4 w-4" />Novo fornecedor
          </button>
        </div>

        {showCreate && (
          <div className="mb-4">
            <FornecedorForm
              initial={emptyForm()}
              onSave={(d) => createMutation.mutate(d)}
              onCancel={() => setShowCreate(false)}
              isPending={createMutation.isPending}
            />
          </div>
        )}

        {isLoading && <p className="text-sm text-gray-500">Carregando...</p>}

        {fornecedores.length === 0 && !isLoading && !showCreate && (
          <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center">
            <Truck className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Nenhum fornecedor cadastrado.</p>
          </div>
        )}

        <div className="space-y-3">
          {fornecedores.map((f) =>
            editId === f.id ? (
              <FornecedorForm
                key={f.id}
                initial={{ nome: f.nome, cnpj: f.cnpj ?? "", contato: f.contato ?? "", email: f.email ?? "", telefone: f.telefone ?? "", observacoes: f.observacoes ?? "" }}
                onSave={(d) => updateMutation.mutate({ id: f.id, data: d })}
                onCancel={() => setEditId(null)}
                isPending={updateMutation.isPending}
              />
            ) : (
              <div key={f.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex items-start gap-4">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <Truck className="h-5 w-5 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{f.nome}</p>
                  {f.cnpj && <p className="text-xs text-gray-400">{f.cnpj}</p>}
                  <div className="flex items-center gap-4 mt-1.5">
                    {f.telefone && <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="h-3 w-3" />{f.telefone}</span>}
                    {f.email && <span className="flex items-center gap-1 text-xs text-gray-500"><Mail className="h-3 w-3" />{f.email}</span>}
                  </div>
                  {f.observacoes && <p className="text-xs text-gray-400 mt-1 italic">{f.observacoes}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditId(f.id)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded transition-colors"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => { if (confirm(`Excluir ${f.nome}?`)) deleteMutation.mutate(f.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
