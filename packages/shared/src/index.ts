/* Shared types across server and UI */

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/* --- CMV types --- */

export type CmvSummary = {
  actualCmvBps: number;
  theoreticalCmvBps: number;
  faturamentoCentavos: number;
  custoMercadoriaCentavos: number;
  ticketMedioCentavos: number | null;
  totalVendas: number | null;
};

export type AlertaSeveridade = "info" | "atencao" | "critico" | "urgente";

/* --- Agent types --- */

export type RunMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type LlmProvedor = "claude" | "gemini" | "openai" | "groq";

/* --- Utility --- */

export function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPct(bps: number): string {
  return `${(bps / 100).toFixed(1)}%`;
}

export function formatPctDiff(bps: number): string {
  const sign = bps >= 0 ? "+" : "";
  return `${sign}${(bps / 100).toFixed(1)}pp`;
}
