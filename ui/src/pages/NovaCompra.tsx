import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, ArrowLeft, Save, AlertCircle, Calculator } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatBRL, cn } from "@/lib/utils";

type Fornecedor = { id: string; nome: string };
type Ingrediente = { id: string; nome: string; unidade: string };

type ItemForm = {
  id: string;
  insumoId: string;
  descricao: string;
  quantidade: string;
  unidade: string;
  precoCentavos: string;
};

const UNIDADES = ["kg", "g", "litro", "ml", "unidade", "porcao", "caixa", "pacote"] as const;

function itemTotal(item: ItemForm): number {
  const qtd = parseFloat(item.quantidade) || 0;
  const preco = parseFloat(item.precoCentavos) || 0;
  return Math.round(qtd * preco);
}

function newItem(): ItemForm {
  return { id: crypto.randomUUID(), insumoId: "", descricao: "", quantidade: "1", unidade: "kg", precoCentavos: "" };
}

export function NovaCompra({ slug }: { slug: string }) {
  const [, navigate] = useLocation();

  /* form state */
  const [fornecedorId, setFornecedorId] = useState("");
  const [dataCompra, setDataCompra] = useState(() => new Date().toISOString().slice(0, 10));
  const [numeroNf, setNumeroNf] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [itens, setItens] = useState<ItemForm[]>([newItem()]);
  const [novoFornecedorNome, setNovoFornecedorNome] = useState("");
  const [showNovoFornecedor, setShowNovoFornecedor] = useState(false);
  const [novoIngredienteNome, setNovoIngredienteNome] = useState("");
  const [novoIngredienteIdx, setNovoIngredienteIdx] = useState<number | null>(null);

  const { data: fornecedores = [], refetch: refetchFornecedores } = useQuery({
    queryKey: ["fornecedores", slug],
    queryFn: () => api.get<Fornecedor[]>(`/empresas/${slug}/fornecedores`),
  });

  const { data: ingredientes = [], refetch: refetchIngredientes } = useQuery({
    queryKey: ["ingredientes", slug],
    queryFn: () => api.get<Ingrediente[]>(`/empresas/${slug}/ingredientes`),
  });

  /* Quick-create fornecedor */
  const criarFornecedorMutation = useMutation({
    mutationFn: (nome: string) => api.post<Fornecedor>(`/empresas/${slug}/fornecedores`, { nome }),
    onSuccess: (f) => {
      refetchFornecedores();
      setFornecedorId(f.id);
      setNovoFornecedorNome("");
      setShowNovoFornecedor(false);
    },
  });

  /* Quick-create ingrediente */
  const criarIngredienteMutation = useMutation({
    mutationFn: ({ nome, idx }: { nome: string; idx: number }) =>
      api.post<Ingrediente>(`/empresas/${slug}/ingredientes`, { nome }).then((i) => ({ i, idx })),
    onSuccess: ({ i, idx }) => {
      refetchIngredientes();
      updateItem(idx, { insumoId: i.id, descricao: i.nome, unidade: i.unidade });
      setNovoIngredienteNome("");
      setNovoIngredienteIdx(null);
    },
  });

  /* Submit compra */
  const compraMutation = useMutation({
    mutationFn: () => {
      const totalCentavos = itens.reduce((s, i) => s + itemTotal(i), 0);
      return api.post(`/empresas/${slug}/compras`, {
        fornecedorId: fornecedorId || undefined,
        dataCompra: new Date(dataCompra + "T12:00:00").toISOString(),
        numeroNf: numeroNf || undefined,
        observacoes: observacoes || undefined,
        totalCentavos,
        itens: itens.map((i) => ({
          insumoId: i.insumoId || undefined,
          descricao: i.descricao,
          quantidade: parseFloat(i.quantidade),
          unidade: i.unidade,
          precoCentavos: Math.round(parseFloat(i.precoCentavos) * 100),
          totalCentavos: Math.round(parseFloat(i.quantidade) * parseFloat(i.precoCentavos) * 100),
        })),
      });
    },
    onSuccess: () => navigate(`/${slug}/compras`),
  });

  function updateItem(idx: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleIngredienteChange(idx: number, insumoId: string) {
    if (insumoId === "__novo__") {
      setNovoIngredienteIdx(idx);
      return;
    }
    const ing = ingredientes.find((i) => i.id === insumoId);
    if (ing) updateItem(idx, { insumoId, descricao: ing.nome, unidade: ing.unidade });
  }

  const totalGeral = itens.reduce((s, i) => s + itemTotal(i), 0);
  const totalGeralReais = totalGeral / 100;
  const canSubmit = itens.length > 0 && itens.every((i) => i.descricao && i.quantidade && i.precoCentavos);

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button onClick={() => navigate(`/${slug}/compras`)} className="p-1 rounded text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Nova Compra</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">
            Total: <span className="text-gray-900 dark:text-gray-100 font-bold">{formatBRL(totalGeral)}</span>
          </span>
          <button
            onClick={() => compraMutation.mutate()}
            disabled={!canSubmit || compraMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            {compraMutation.isPending ? "Salvando..." : "Registrar Compra"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Seção 1 — Dados da Nota */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Dados da Nota</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fornecedor</label>
              {showNovoFornecedor ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={novoFornecedorNome}
                    onChange={(e) => setNovoFornecedorNome(e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={() => criarFornecedorMutation.mutate(novoFornecedorNome)}
                    disabled={!novoFornecedorNome}
                    className="px-3 py-2 bg-orange-600 text-white text-sm rounded-lg disabled:opacity-40"
                  >
                    Salvar
                  </button>
                  <button onClick={() => setShowNovoFornecedor(false)} className="px-3 py-2 text-sm text-gray-500">
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={fornecedorId}
                    onChange={(e) => setFornecedorId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Selecionar fornecedor (opcional)</option>
                    {fornecedores.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                  <button onClick={() => setShowNovoFornecedor(true)} className="text-xs text-orange-600 hover:text-orange-700 px-2">
                    + Novo
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data da compra</label>
              <input
                type="date"
                value={dataCompra}
                onChange={(e) => setDataCompra(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Número da NF (opcional)</label>
              <input
                value={numeroNf}
                onChange={(e) => setNumeroNf(e.target.value)}
                placeholder="Ex: 00123"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações (opcional)</label>
              <textarea
                rows={2}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Entrega atrasada, produto em bom estado..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>
        </section>

        {/* Seção 2 — Itens */}
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Itens da Nota</h2>
            <button
              onClick={() => setItens((prev) => [...prev, newItem()])}
              className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar item
            </button>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Ingrediente</span>
            <span>Qtd</span>
            <span>Unidade</span>
            <span>Preço unit. (R$)</span>
            <span className="text-right">Total</span>
            <span />
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {itens.map((item, idx) => (
              <div key={item.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 items-center">
                {/* Ingrediente */}
                {novoIngredienteIdx === idx ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={novoIngredienteNome}
                      onChange={(e) => setNovoIngredienteNome(e.target.value)}
                      placeholder="Nome do ingrediente"
                      className="flex-1 px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      onClick={() => criarIngredienteMutation.mutate({ nome: novoIngredienteNome, idx })}
                      disabled={!novoIngredienteNome}
                      className="px-2 py-1.5 bg-orange-600 text-white text-xs rounded-md disabled:opacity-40"
                    >
                      OK
                    </button>
                    <button onClick={() => setNovoIngredienteIdx(null)} className="px-2 text-gray-400 text-xs">✕</button>
                  </div>
                ) : (
                  <select
                    value={item.insumoId}
                    onChange={(e) => handleIngredienteChange(idx, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Selecionar ou digitar</option>
                    {ingredientes.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                    <option value="__novo__">+ Novo ingrediente</option>
                  </select>
                )}

                {/* Quantidade */}
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={item.quantidade}
                  onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums"
                />

                {/* Unidade */}
                <select
                  value={item.unidade}
                  onChange={(e) => updateItem(idx, { unidade: e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>

                {/* Preço unitário */}
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.precoCentavos}
                    onChange={(e) => updateItem(idx, { precoCentavos: e.target.value })}
                    placeholder="0,00"
                    className="w-full pl-7 pr-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 tabular-nums"
                  />
                </div>

                {/* Total calculado */}
                <div className="text-right">
                  <span className={cn("text-sm font-medium tabular-nums", itemTotal(item) > 0 ? "text-gray-900 dark:text-gray-100" : "text-gray-300")}>
                    {itemTotal(item) > 0 ? formatBRL(itemTotal(item) * 100) : "—"}
                  </span>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(idx)}
                  disabled={itens.length === 1}
                  className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-0 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Total geral */}
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calculator className="h-4 w-4" />
              {itens.length} {itens.length === 1 ? "item" : "itens"}
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Total: {formatBRL(totalGeral * 100)}
            </div>
          </div>
        </section>

        {/* Erro */}
        {compraMutation.error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{compraMutation.error.message}</p>
          </div>
        )}

        {/* Botões footer */}
        <div className="flex justify-end gap-3 pb-8">
          <button onClick={() => navigate(`/${slug}/compras`)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
            Cancelar
          </button>
          <button
            onClick={() => compraMutation.mutate()}
            disabled={!canSubmit || compraMutation.isPending}
            className="flex items-center gap-1.5 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            {compraMutation.isPending ? "Salvando..." : "Registrar Compra"}
          </button>
        </div>
      </div>
    </div>
  );
}
