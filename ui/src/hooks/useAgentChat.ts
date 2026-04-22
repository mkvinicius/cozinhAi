import { useState, useCallback, useRef } from "react";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  runId?: string;
  isStreaming?: boolean;
};

type UseChatOptions = {
  slug: string;
  agenteId: string;
};

export function useAgentChat({ slug, agenteId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      setError(null);

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsLoading(true);

      /* Build history from prior messages for context */
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      }));

      abortRef.current = new AbortController();

      try {
        const res = await fetch(`/api/empresas/${slug}/agentes/${agenteId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message: text, history }),
          signal: abortRef.current.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: token")) continue;
            if (line.startsWith("data: ")) {
              try {
                const payload = JSON.parse(line.slice(6));

                if (payload.content !== undefined) {
                  /* token event */
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, content: m.content + payload.content }
                        : m,
                    ),
                  );
                } else if (payload.runId) {
                  /* done event */
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, isStreaming: false, runId: payload.runId }
                        : m,
                    ),
                  );
                } else if (payload.message) {
                  /* error event */
                  throw new Error(payload.message);
                }
              } catch (parseErr) {
                if (parseErr instanceof SyntaxError) continue;
                throw parseErr;
              }
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Erro: ${msg}`, isStreaming: false } : m,
          ),
        );
      } finally {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
      }
    },
    [slug, agenteId, isLoading, messages],
  );

  function clearChat() {
    setMessages([]);
    setError(null);
  }

  function abort() {
    abortRef.current?.abort();
    setIsLoading(false);
  }

  return { messages, isLoading, error, sendMessage, clearChat, abort };
}
