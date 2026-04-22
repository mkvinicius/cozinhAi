import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Bot,
  ArrowLeft,
  Send,
  Square,
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAgentChat } from "@/hooks/useAgentChat";
import { cn } from "@/lib/utils";

type Agente = {
  id: string;
  slug: string;
  nome: string;
  papel: string;
  instrucoes: string;
  ativo: boolean;
  llmProvedor: string | null;
  llmModelo: string | null;
};

type Run = {
  id: string;
  status: "iniciando" | "rodando" | "pausado" | "concluido" | "erro";
  entrada: string | null;
  saida: string | null;
  tokensUsados: number | null;
  iniciadoEm: string;
  concluidoEm: string | null;
};

/* ---- sub-components ---- */

function MessageBubble({
  role,
  content,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
          isUser
            ? "bg-orange-600 text-white rounded-tr-sm"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm",
        )}
      >
        {content ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <span className="flex items-center gap-1 text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Pensando...
          </span>
        )}
        {isStreaming && content && (
          <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function RunHistoryItem({ run }: { run: Run }) {
  const [open, setOpen] = useState(false);
  const statusIcon =
    run.status === "concluido" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    ) : run.status === "erro" ? (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    ) : (
      <Loader2 className="h-3.5 w-3.5 text-amber-500 animate-spin" />
    );

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {statusIcon}
        <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 truncate">
          {run.entrada ?? "(sem entrada)"}
        </span>
        <span className="text-xs text-gray-400">
          {new Date(run.iniciadoEm).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {open && run.saida && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {run.saida}
          </p>
          {run.tokensUsados && (
            <p className="text-[10px] text-gray-400 mt-2">~{run.tokensUsados} tokens</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- main component ---- */

export function AgenteDetail({ slug, agenteId }: { slug: string; agenteId: string }) {
  const [, navigate] = useLocation();
  const [input, setInput] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [showInstrucoes, setShowInstrucoes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: ag, isLoading: agLoading } = useQuery({
    queryKey: ["agente", slug, agenteId],
    queryFn: () => api.get<Agente>(`/empresas/${slug}/agentes/${agenteId}`),
  });

  const { data: runs = [], refetch: refetchRuns } = useQuery({
    queryKey: ["runs", slug, agenteId],
    queryFn: () => api.get<Run[]>(`/empresas/${slug}/agentes/${agenteId}/runs`),
    enabled: showHistory,
  });

  const { messages, isLoading, error, sendMessage, clearChat, abort } = useAgentChat({
    slug,
    agenteId,
  });

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
    refetchRuns();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (agLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!ag) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500">Agente não encontrado</p>
        <button onClick={() => navigate(`/${slug}/agentes`)} className="text-sm text-orange-600">
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0">
        <button
          onClick={() => navigate(`/${slug}/agentes`)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
          <Bot className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{ag.nome}</p>
          <p className="text-xs text-gray-500 truncate">{ag.papel}</p>
        </div>

        <div className="flex items-center gap-1">
          {ag.llmModelo && (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded font-mono">
              {ag.llmModelo}
            </span>
          )}
          <button
            onClick={() => { setShowHistory((s) => !s); if (!showHistory) refetchRuns(); }}
            className={cn(
              "p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors",
              showHistory && "text-orange-500",
            )}
            title="Histórico de runs"
          >
            <Clock className="h-4 w-4" />
          </button>
          <button
            onClick={clearChat}
            disabled={messages.length === 0}
            className="p-1.5 rounded text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
            title="Limpar conversa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Instruções colapsável */}
          <div className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={() => setShowInstrucoes((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <span>Ver instruções do agente</span>
              {showInstrucoes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showInstrucoes && (
              <div className="px-4 pb-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed font-mono bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                  {ag.instrucoes}
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                  <Bot className="h-7 w-7 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{ag.nome}</p>
                  <p className="text-sm text-gray-500 mt-1 max-w-xs">{ag.papel}</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    "Como está meu CMV esta semana?",
                    "Quais fornecedores têm o preço mais alto?",
                    "Me dê um resumo financeiro do mês",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                role={m.role}
                content={m.content}
                isStreaming={m.isStreaming}
              />
            ))}

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Mensagem para ${ag.nome}...`}
                disabled={isLoading}
                className="flex-1 resize-none px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 leading-relaxed"
              />
              {isLoading ? (
                <button
                  onClick={abort}
                  className="p-2 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-200 transition-colors"
                  title="Parar"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white transition-colors"
                  title="Enviar (Enter)"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              Enter para enviar · Shift+Enter nova linha
            </p>
          </div>
        </div>

        {/* History panel */}
        {showHistory && (
          <div className="w-72 border-l border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50 dark:bg-gray-900/50">
            <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-800">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                Histórico de Runs
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {runs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Nenhum run ainda</p>
              ) : (
                runs.map((r) => <RunHistoryItem key={r.id} run={r} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
