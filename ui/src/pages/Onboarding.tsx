import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  ChefHat,
  Building2,
  TrendingDown,
  Bot,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/* ---- types ---- */

type Tipo =
  | "restaurante"
  | "buffet"
  | "pizzaria"
  | "hamburgueria"
  | "marmitaria"
  | "padaria"
  | "bar"
  | "outro";

type Provedor = "claude" | "gemini" | "openai";

type FormData = {
  /* step 1 */
  nome: string;
  slug: string;
  tipo: Tipo;
  cidade: string;
  estado: string;
  /* step 2 */
  metaCmvBps: number;
  /* step 3 */
  llmProvedor: Provedor;
  llmApiKey: string;
  llmModelo: string;
};

/* ---- constants ---- */

const TIPOS: { value: Tipo; label: string; emoji: string }[] = [
  { value: "restaurante", label: "Restaurante", emoji: "🍽️" },
  { value: "buffet", label: "Buffet / Por kilo", emoji: "🥘" },
  { value: "pizzaria", label: "Pizzaria", emoji: "🍕" },
  { value: "hamburgueria", label: "Hamburgueria", emoji: "🍔" },
  { value: "marmitaria", label: "Marmitaria", emoji: "📦" },
  { value: "padaria", label: "Padaria / Café", emoji: "☕" },
  { value: "bar", label: "Bar / Boteco", emoji: "🍺" },
  { value: "outro", label: "Outro", emoji: "🏪" },
];

const META_REFERENCIAS: { tipo: Tipo; metaLabel: string; metaBps: number }[] = [
  { tipo: "restaurante", metaLabel: "28–35%", metaBps: 3000 },
  { tipo: "buffet", metaLabel: "25–32%", metaBps: 2800 },
  { tipo: "pizzaria", metaLabel: "28–38%", metaBps: 3200 },
  { tipo: "hamburgueria", metaLabel: "30–40%", metaBps: 3500 },
  { tipo: "marmitaria", metaLabel: "30–38%", metaBps: 3200 },
  { tipo: "padaria", metaLabel: "20–30%", metaBps: 2500 },
  { tipo: "bar", metaLabel: "25–35%", metaBps: 2800 },
  { tipo: "outro", metaLabel: "30–40%", metaBps: 3200 },
];

const PROVEDORES: { value: Provedor; label: string; desc: string; keyLabel: string; defaultModelo: string }[] = [
  {
    value: "claude",
    label: "Claude (Anthropic)",
    desc: "Melhor para raciocínio estratégico e análise financeira",
    keyLabel: "Chave da API Anthropic",
    defaultModelo: "claude-sonnet-4-6",
  },
  {
    value: "gemini",
    label: "Gemini (Google)",
    desc: "Rápido, econômico e com grande janela de contexto",
    keyLabel: "Chave da API Google AI",
    defaultModelo: "gemini-2.0-flash",
  },
  {
    value: "openai",
    label: "GPT-4o (OpenAI)",
    desc: "Amplamente testado, ótimo para tarefas gerais",
    keyLabel: "Chave da API OpenAI",
    defaultModelo: "gpt-4o",
  },
];

const AGENTES_DEFAULT = [
  {
    nome: "CEO Agente",
    papel: "Análise estratégica semanal e recomendações de CMV",
    icon: "👔",
  },
  {
    nome: "Gestor de CMV",
    papel: "Monitoramento de custos, preços e alertas de desvio",
    icon: "📊",
  },
  {
    nome: "Comprador",
    papel: "Cotações, registro de notas fiscais e controle de fornecedores",
    icon: "🛒",
  },
];

const STEPS = [
  { label: "Restaurante", icon: Building2 },
  { label: "Meta CMV", icon: TrendingDown },
  { label: "Inteligência", icon: Bot },
  { label: "Agentes", icon: Sparkles },
  { label: "Pronto!", icon: CheckCircle2 },
];

/* ---- helpers ---- */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

/* ---- sub-components ---- */

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                  done && "bg-orange-500 text-white",
                  active && "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 ring-2 ring-orange-500",
                  !done && !active && "bg-gray-100 dark:bg-gray-800 text-gray-400",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium hidden sm:block",
                  active ? "text-orange-600 dark:text-orange-400" : "text-gray-400",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 mx-1 mb-4 rounded transition-all",
                  done ? "bg-orange-500" : "bg-gray-200 dark:bg-gray-700",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- steps ---- */

function Step1({
  data,
  onChange,
  slugError,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
  slugError: string;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Seu restaurante</h2>
        <p className="text-sm text-gray-500 mt-1">Vamos começar com as informações básicas.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome do restaurante
          </label>
          <input
            autoFocus
            value={data.nome}
            onChange={(e) => onChange({ nome: e.target.value, slug: slugify(e.target.value) })}
            placeholder="Ex: Sabor da Vovó"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Endereço na URL
          </label>
          <div className="flex items-center gap-0">
            <span className="px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-r-0 border-gray-300 dark:border-gray-700 rounded-l-lg text-xs text-gray-500">
              cozinhai.app/
            </span>
            <input
              value={data.slug}
              onChange={(e) => onChange({ slug: slugify(e.target.value) })}
              placeholder="sabor-da-vovo"
              className={cn(
                "flex-1 px-3 py-2 rounded-r-lg border bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500",
                slugError
                  ? "border-red-400 focus:ring-red-400"
                  : "border-gray-300 dark:border-gray-700",
              )}
            />
          </div>
          {slugError && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {slugError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tipo de negócio
          </label>
          <div className="grid grid-cols-4 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => onChange({ tipo: t.value })}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all",
                  data.tipo === t.value
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400",
                )}
              >
                <span className="text-lg">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cidade
            </label>
            <input
              value={data.cidade}
              onChange={(e) => onChange({ cidade: e.target.value })}
              placeholder="São Paulo"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Estado
            </label>
            <select
              value={data.estado}
              onChange={(e) => onChange({ estado: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"].map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2({ data, onChange }: { data: FormData; onChange: (patch: Partial<FormData>) => void }) {
  const ref = META_REFERENCIAS.find((r) => r.tipo === data.tipo);
  const pct = (data.metaCmvBps / 100).toFixed(1);

  const cmvStatus =
    data.metaCmvBps <= 3000
      ? { label: "Excelente controle", color: "text-green-600" }
      : data.metaCmvBps <= 3500
      ? { label: "Adequado", color: "text-amber-600" }
      : { label: "Atenção redobrada", color: "text-orange-600" };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Meta de CMV</h2>
        <p className="text-sm text-gray-500 mt-1">
          CMV (Custo de Mercadoria Vendida) é o percentual do faturamento gasto com insumos.
          Quanto menor, mais lucrativo.
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <div className="flex items-end justify-between mb-3">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Meta de CMV</span>
          <div className="text-right">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{pct}%</span>
            <p className={cn("text-xs font-medium mt-0.5", cmvStatus.color)}>{cmvStatus.label}</p>
          </div>
        </div>

        <input
          type="range"
          min={1500}
          max={6000}
          step={50}
          value={data.metaCmvBps}
          onChange={(e) => onChange({ metaCmvBps: parseInt(e.target.value) })}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>15%</span>
          <span>60%</span>
        </div>
      </div>

      {ref && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 dark:text-blue-300">
            <p className="font-medium">Referência para {TIPOS.find((t) => t.value === data.tipo)?.label}</p>
            <p className="mt-0.5">
              A média do setor fica entre <strong>{ref.metaLabel}</strong>. Sua meta de{" "}
              <strong>{pct}%</strong>{" "}
              {data.metaCmvBps <= ref.metaBps + 300
                ? "está dentro do esperado."
                : "está acima da média — os agentes vão te ajudar a reduzir."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Meta agressiva", bps: 2500, note: "Difícil, mas possível" },
          { label: "Meta conservadora", bps: ref?.metaBps ?? 3200, note: "Referência do setor" },
          { label: "Meta inicial", bps: 4000, note: "Para começar" },
        ].map((preset) => (
          <button
            key={preset.bps}
            type="button"
            onClick={() => onChange({ metaCmvBps: preset.bps })}
            className={cn(
              "p-3 rounded-lg border text-xs transition-all",
              data.metaCmvBps === preset.bps
                ? "border-orange-400 bg-orange-50 dark:bg-orange-950"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
            )}
          >
            <p className="font-bold text-base text-gray-900 dark:text-gray-100">
              {(preset.bps / 100).toFixed(0)}%
            </p>
            <p className="font-medium text-gray-700 dark:text-gray-300 mt-0.5">{preset.label}</p>
            <p className="text-gray-400 mt-0.5">{preset.note}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Step3({
  data,
  onChange,
  onTest,
  testStatus,
}: {
  data: FormData;
  onChange: (patch: Partial<FormData>) => void;
  onTest: () => void;
  testStatus: "idle" | "testing" | "ok" | "error";
}) {
  const [showKey, setShowKey] = useState(false);
  const selected = PROVEDORES.find((p) => p.value === data.llmProvedor)!;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Inteligência Artificial</h2>
        <p className="text-sm text-gray-500 mt-1">
          Escolha qual IA vai alimentar seus agentes. Você pode trocar depois.
        </p>
      </div>

      <div className="space-y-2">
        {PROVEDORES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange({ llmProvedor: p.value, llmModelo: p.defaultModelo, llmApiKey: "" })}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all",
              data.llmProvedor === p.value
                ? "border-orange-400 bg-orange-50 dark:bg-orange-950"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                data.llmProvedor === p.value ? "bg-orange-500" : "bg-gray-300",
              )}
            />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
            </div>
          </button>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {selected.keyLabel}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? "text" : "password"}
              value={data.llmApiKey}
              onChange={(e) => onChange({ llmApiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full px-3 py-2 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={onTest}
            disabled={!data.llmApiKey || testStatus === "testing"}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-40",
              testStatus === "ok" && "border-green-400 text-green-600 bg-green-50",
              testStatus === "error" && "border-red-400 text-red-600 bg-red-50",
              testStatus === "idle" && "border-gray-300 text-gray-600 hover:border-gray-400",
              testStatus === "testing" && "border-gray-300 text-gray-400",
            )}
          >
            {testStatus === "testing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testStatus === "ok" ? (
              "✓ OK"
            ) : testStatus === "error" ? (
              "✗ Falhou"
            ) : (
              "Testar"
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">
          A chave fica salva de forma segura e nunca aparece no frontend.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Modelo
        </label>
        <input
          value={data.llmModelo}
          onChange={(e) => onChange({ llmModelo: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
        />
      </div>
    </div>
  );
}

function Step4({ data }: { data: FormData }) {
  const providerLabel = PROVEDORES.find((p) => p.value === data.llmProvedor)?.label ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sua equipe de agentes</h2>
        <p className="text-sm text-gray-500 mt-1">
          Estes agentes serão criados automaticamente e entram em ação assim que você registrar a
          primeira nota fiscal.
        </p>
      </div>

      <div className="space-y-3">
        {AGENTES_DEFAULT.map((a) => (
          <div
            key={a.nome}
            className="flex items-start gap-3 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <span className="text-2xl">{a.icon}</span>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{a.nome}</p>
              <p className="text-xs text-gray-500 mt-0.5">{a.papel}</p>
              <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-mono">
                {data.llmModelo}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
        <p className="text-xs text-orange-700 dark:text-orange-300">
          <strong>Provedor:</strong> {providerLabel} · <strong>Meta CMV:</strong>{" "}
          {(data.metaCmvBps / 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
}

function Step5({ nome, slug }: { nome: string; slug: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="text-center space-y-6 py-4">
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950 rounded-full flex items-center justify-center">
            <ChefHat className="h-10 w-10 text-orange-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {nome} está pronto! 🎉
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
          Seus 3 agentes foram criados e estão aguardando a primeira nota fiscal para entrar em ação.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 text-left max-w-xs mx-auto">
        {[
          "Registre sua primeira NF de compra",
          "Os agentes calculam o CMV automaticamente",
          "Receba recomendações toda semana",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shrink-0 font-bold">
              {i + 1}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(`/${slug}/dashboard`)}
        className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-xl transition-colors"
      >
        Entrar no dashboard
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---- main component ---- */

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [slugError, setSlugError] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "error">("idle");
  const [done, setDone] = useState<{ nome: string; slug: string } | null>(null);

  const [form, setForm] = useState<FormData>({
    nome: "",
    slug: "",
    tipo: "restaurante",
    cidade: "",
    estado: "SP",
    metaCmvBps: 3200,
    llmProvedor: "claude",
    llmApiKey: "",
    llmModelo: "claude-sonnet-4-6",
  });

  function patch(data: Partial<FormData>) {
    setForm((f) => ({ ...f, ...data }));
    if (data.llmProvedor) setTestStatus("idle");
  }

  /* Slug availability check */
  useEffect(() => {
    if (!form.slug || form.slug.length < 2) { setSlugError(""); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/onboarding/check-slug/${form.slug}`);
        setSlugError(res.available ? "" : "Este endereço já está em uso");
      } catch {
        setSlugError("");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.slug]);

  async function handleTestKey() {
    setTestStatus("testing");
    try {
      await new Promise((r) => setTimeout(r, 800));
      const ok = form.llmApiKey.length > 15;
      setTestStatus(ok ? "ok" : "error");
    } catch {
      setTestStatus("error");
    }
  }

  const submitMutation = useMutation({
    mutationFn: () => api.post<{ slug: string; nome: string }>("/onboarding", form),
    onSuccess: (data) => setDone(data),
  });

  function canAdvance(): boolean {
    if (step === 0) return !!form.nome && !!form.slug && !!form.cidade && !slugError;
    if (step === 1) return form.metaCmvBps >= 1000;
    if (step === 2) return !!form.llmApiKey && form.llmApiKey.length > 10;
    return true;
  }

  function advance() {
    if (step === 3) { submitMutation.mutate(); return; }
    setStep((s) => s + 1);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <Step5 nome={done.nome} slug={done.slug} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <ChefHat className="h-6 w-6 text-orange-500" />
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">CozinhAI</span>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
          <StepIndicator current={step} />

          <div className="min-h-[360px]">
            {step === 0 && <Step1 data={form} onChange={patch} slugError={slugError} />}
            {step === 1 && <Step2 data={form} onChange={patch} />}
            {step === 2 && (
              <Step3 data={form} onChange={patch} onTest={handleTestKey} testStatus={testStatus} />
            )}
            {step === 3 && <Step4 data={form} />}
          </div>

          {submitMutation.error && (
            <p className="text-sm text-red-600 mt-4 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {submitMutation.error.message}
            </p>
          )}

          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            <button
              type="button"
              onClick={advance}
              disabled={!canAdvance() || submitMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-medium rounded-xl text-sm transition-colors"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : step === 3 ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  Criar meu restaurante
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Passo {step + 1} de {STEPS.length - 1}
        </p>
      </div>
    </div>
  );
}
