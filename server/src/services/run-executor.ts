import { eq, and } from "drizzle-orm";
import type { Db } from "@cozinhai/db";
import { agente, run, empresa, membro, configuracao } from "@cozinhai/db";
import { ClaudeAdapter } from "@cozinhai/adapter-claude";
import { GeminiAdapter } from "@cozinhai/adapter-gemini";
import { OpenAIAdapter } from "@cozinhai/adapter-openai";
import type { RunMessage } from "@cozinhai/shared";

export type RunEvent =
  | { type: "token"; content: string }
  | { type: "done"; runId: string; tokensEstimated: number }
  | { type: "error"; message: string };

export type StartRunOptions = {
  empresaSlug: string;
  agenteId: string;
  userId: string;
  input: string;
  history?: RunMessage[];
  tarefaId?: string;
};

/* Resolve empresa + membership + agent + LLM config */
async function resolveContext(db: Db, opts: StartRunOptions) {
  const [emp] = await db
    .select()
    .from(empresa)
    .where(eq(empresa.slug, opts.empresaSlug));
  if (!emp) throw new Error("Empresa não encontrada");

  const [mem] = await db
    .select()
    .from(membro)
    .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, opts.userId)));
  if (!mem) throw new Error("Acesso negado");

  const [ag] = await db
    .select()
    .from(agente)
    .where(and(eq(agente.id, opts.agenteId), eq(agente.empresaId, emp.id)));
  if (!ag) throw new Error("Agente não encontrado");

  const [config] = await db
    .select()
    .from(configuracao)
    .where(eq(configuracao.empresaId, emp.id));
  if (!config?.llmApiKey) throw new Error("Chave de API não configurada");

  /* Agent-level provider overrides empresa default */
  const provedor = ag.llmProvedor ?? config.llmProvedor;
  const modelo = ag.llmModelo ?? config.llmModelo ?? undefined;
  const apiKey = config.llmApiKey;

  return { emp, ag, provedor, modelo, apiKey };
}

function buildAdapter(
  provedor: string,
  apiKey: string,
  modelo?: string,
) {
  const modelOverride = modelo !== undefined ? { model: modelo } : {};
  if (provedor === "claude") return new ClaudeAdapter({ apiKey, ...modelOverride });
  if (provedor === "gemini") return new GeminiAdapter({ apiKey, ...modelOverride });
  if (provedor === "openai") return new OpenAIAdapter({ apiKey, ...modelOverride });
  throw new Error(`Provedor desconhecido: ${provedor}`);
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

/* Main streaming executor — yields RunEvents */
export async function* streamRun(
  db: Db,
  opts: StartRunOptions,
): AsyncGenerator<RunEvent> {
  /* 1. Resolve context */
  let context: Awaited<ReturnType<typeof resolveContext>>;
  try {
    context = await resolveContext(db, opts);
  } catch (err) {
    yield { type: "error", message: err instanceof Error ? err.message : String(err) };
    return;
  }

  const { emp, ag, provedor, modelo, apiKey } = context;

  /* 2. Create run record (status: rodando) */
  const [runRecord] = await db
    .insert(run)
    .values({
      empresaId: emp.id,
      agenteId: ag.id,
      tarefaId: opts.tarefaId ?? null,
      status: "rodando",
      entrada: opts.input,
      iniciadoEm: new Date(),
    })
    .returning();

  if (!runRecord) {
    yield { type: "error", message: "Erro ao criar registro de run" };
    return;
  }

  /* 3. Build messages */
  const messages: RunMessage[] = [
    ...(opts.history ?? []),
    { role: "user", content: opts.input, timestamp: new Date().toISOString() },
  ];

  /* 4. Stream from LLM */
  const adapter = buildAdapter(provedor, apiKey, modelo ?? undefined);
  let fullOutput = "";

  try {
    for await (const token of adapter.stream(messages, ag.instrucoes)) {
      fullOutput += token;
      yield { type: "token", content: token };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro no LLM";
    await db
      .update(run)
      .set({ status: "erro", erroMsg: msg, concluidoEm: new Date() })
      .where(eq(run.id, runRecord.id));
    yield { type: "error", message: msg };
    return;
  }

  /* 5. Persist completed run */
  const tokens = estimateTokens(opts.input + fullOutput);
  await db
    .update(run)
    .set({
      status: "concluido",
      saida: fullOutput,
      tokensUsados: tokens,
      concluidoEm: new Date(),
    })
    .where(eq(run.id, runRecord.id));

  yield { type: "done", runId: runRecord.id, tokensEstimated: tokens };
}
