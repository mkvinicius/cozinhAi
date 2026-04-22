import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* =========================================================
   ENUMS
   ========================================================= */

export const membroRoleEnum = pgEnum("membro_role", [
  "dono",
  "gerente",
  "cozinheiro",
  "caixa",
  "visualizador",
]);

export const tarefaStatusEnum = pgEnum("tarefa_status", [
  "pendente",
  "em_progresso",
  "aguardando",
  "concluida",
  "cancelada",
]);

export const tarefaPrioridadeEnum = pgEnum("tarefa_prioridade", [
  "urgente",
  "alta",
  "normal",
  "baixa",
]);

export const runStatusEnum = pgEnum("run_status", [
  "iniciando",
  "rodando",
  "pausado",
  "concluido",
  "erro",
]);

export const cmvAlertaTipoEnum = pgEnum("cmv_alerta_tipo", [
  "preco_subiu",
  "cmv_acima_meta",
  "estoque_critico",
  "fornecedor_irregular",
  "desperdicio_alto",
]);

export const cmvAlertaSeveridadeEnum = pgEnum("cmv_alerta_severidade", [
  "info",
  "atencao",
  "critico",
  "urgente",
]);

export const insumoUnidadeEnum = pgEnum("insumo_unidade", [
  "kg",
  "g",
  "litro",
  "ml",
  "unidade",
  "porcao",
  "caixa",
  "pacote",
]);

export const llmProvedorEnum = pgEnum("llm_provedor", ["claude", "gemini", "openai", "groq"]);

/* =========================================================
   EMPRESA (company)
   ========================================================= */

export const empresa = pgTable("empresa", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull().default("restaurante"),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado").default("SP"),
  logoUrl: text("logo_url"),
  metaCmvBps: integer("meta_cmv_bps").notNull().default(3200),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   AUTH — users & sessions (Better Auth compatible)
   ========================================================= */

export const usuario = pgTable("usuario", {
  id: text("id").primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  emailVerificado: boolean("email_verificado").notNull().default(false),
  imagemUrl: text("imagem_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessao = pgTable("sessao", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
});

export const conta = pgTable("conta", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verificacao = pgTable("verificacao", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   MEMBROS (members — links usuario <-> empresa)
   ========================================================= */

export const membro = pgTable("membro", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  usuarioId: text("usuario_id")
    .notNull()
    .references(() => usuario.id, { onDelete: "cascade" }),
  role: membroRoleEnum("role").notNull().default("visualizador"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* =========================================================
   CONFIGURACOES (settings — per empresa)
   ========================================================= */

export const configuracao = pgTable("configuracao", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" })
    .unique(),
  llmProvedor: llmProvedorEnum("llm_provedor").notNull().default("claude"),
  llmApiKey: text("llm_api_key"),
  llmModelo: text("llm_modelo"),
  instagramToken: text("instagram_token"),
  telegramToken: text("telegram_token"),
  webhookUrl: text("webhook_url"),
  extras: jsonb("extras"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   AGENTES (agents)
   ========================================================= */

export const agente = pgTable("agente", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  nome: text("nome").notNull(),
  papel: text("papel").notNull(),
  instrucoes: text("instrucoes").notNull(),
  llmProvedor: llmProvedorEnum("llm_provedor"),
  llmModelo: text("llm_modelo"),
  ativo: boolean("ativo").notNull().default(true),
  metadados: jsonb("metadados"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   TAREFAS (tasks)
   ========================================================= */

export const tarefa = pgTable("tarefa", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  status: tarefaStatusEnum("status").notNull().default("pendente"),
  prioridade: tarefaPrioridadeEnum("prioridade").notNull().default("normal"),
  agenteId: uuid("agente_id").references(() => agente.id, { onDelete: "set null" }),
  criadoPorId: text("criado_por_id").references(() => usuario.id, { onDelete: "set null" }),
  atribuidoParaId: text("atribuido_para_id").references(() => usuario.id, {
    onDelete: "set null",
  }),
  prazo: timestamp("prazo"),
  contexto: jsonb("contexto"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const comentario = pgTable("comentario", {
  id: uuid("id").primaryKey().defaultRandom(),
  tarefaId: uuid("tarefa_id")
    .notNull()
    .references(() => tarefa.id, { onDelete: "cascade" }),
  autorId: text("autor_id").references(() => usuario.id, { onDelete: "set null" }),
  agenteId: uuid("agente_id").references(() => agente.id, { onDelete: "set null" }),
  conteudo: text("conteudo").notNull(),
  metadados: jsonb("metadados"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* =========================================================
   RUNS (agent execution logs)
   ========================================================= */

export const run = pgTable("run", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  agenteId: uuid("agente_id")
    .notNull()
    .references(() => agente.id, { onDelete: "cascade" }),
  tarefaId: uuid("tarefa_id").references(() => tarefa.id, { onDelete: "set null" }),
  status: runStatusEnum("status").notNull().default("iniciando"),
  entrada: text("entrada"),
  saida: text("saida"),
  erroMsg: text("erro_msg"),
  tokensUsados: integer("tokens_usados"),
  custoCentavos: integer("custo_centavos"),
  iniciadoEm: timestamp("iniciado_em").notNull().defaultNow(),
  concluidoEm: timestamp("concluido_em"),
});

/* =========================================================
   ROTINAS (scheduled tasks)
   ========================================================= */

export const rotina = pgTable("rotina", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  agenteId: uuid("agente_id")
    .notNull()
    .references(() => agente.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  cron: text("cron").notNull(),
  instrucao: text("instrucao").notNull(),
  ativa: boolean("ativa").notNull().default(true),
  ultimaExecucao: timestamp("ultima_execucao"),
  proximaExecucao: timestamp("proxima_execucao"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* =========================================================
   CMV — FORNECEDORES (suppliers)
   ========================================================= */

export const cmvFornecedor = pgTable("cmv_fornecedor", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  contato: text("contato"),
  email: text("email"),
  telefone: text("telefone"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   CMV — INSUMOS (ingredients / inputs)
   ========================================================= */

export const cmvInsumo = pgTable("cmv_insumo", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  categoria: text("categoria"),
  unidade: insumoUnidadeEnum("unidade").notNull().default("kg"),
  precoReferenciaCentavos: integer("preco_referencia_centavos"),
  fornecedorPrincipalId: uuid("fornecedor_principal_id").references(() => cmvFornecedor.id, {
    onDelete: "set null",
  }),
  estoqueMinimo: integer("estoque_minimo"),
  estoqueMiliUnidades: integer("estoque_mili_unidades").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* =========================================================
   CMV — COMPRAS (purchases / NF)
   ========================================================= */

export const cmvCompra = pgTable("cmv_compra", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  fornecedorId: uuid("fornecedor_id").references(() => cmvFornecedor.id, {
    onDelete: "set null",
  }),
  numeroNf: text("numero_nf"),
  dataCompra: timestamp("data_compra").notNull(),
  totalCentavos: integer("total_centavos").notNull(),
  observacoes: text("observacoes"),
  registradoPorId: text("registrado_por_id").references(() => usuario.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cmvCompraItem = pgTable("cmv_compra_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  compraId: uuid("compra_id")
    .notNull()
    .references(() => cmvCompra.id, { onDelete: "cascade" }),
  insumoId: uuid("insumo_id").references(() => cmvInsumo.id, { onDelete: "set null" }),
  descricao: text("descricao").notNull(),
  quantidade: integer("quantidade").notNull(),
  unidade: insumoUnidadeEnum("unidade").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  totalCentavos: integer("total_centavos").notNull(),
});

/* =========================================================
   CMV — SNAPSHOTS (weekly/monthly CMV summary)
   ========================================================= */

export const cmvSnapshot = pgTable("cmv_snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  periodo: text("periodo").notNull(),
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim").notNull(),
  faturamentoCentavos: bigint("faturamento_centavos", { mode: "number" }).notNull(),
  custoMercadoriaCentavos: bigint("custo_mercadoria_centavos", { mode: "number" }).notNull(),
  actualCmvBps: integer("actual_cmv_bps").notNull(),
  theoreticalCmvBps: integer("theoretical_cmv_bps").notNull(),
  ticketMedioCentavos: integer("ticket_medio_centavos"),
  totalVendas: integer("total_vendas"),
  observacoes: text("observacoes"),
  geradoPorAgenteId: uuid("gerado_por_agente_id").references(() => agente.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* =========================================================
   CMV — ALERTAS (alerts)
   ========================================================= */

export const cmvAlerta = pgTable("cmv_alerta", {
  id: uuid("id").primaryKey().defaultRandom(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresa.id, { onDelete: "cascade" }),
  tipo: cmvAlertaTipoEnum("tipo").notNull(),
  severidade: cmvAlertaSeveridadeEnum("severidade").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao").notNull(),
  impactoCentavos: integer("impacto_centavos"),
  insumoId: uuid("insumo_id").references(() => cmvInsumo.id, { onDelete: "set null" }),
  fornecedorId: uuid("fornecedor_id").references(() => cmvFornecedor.id, { onDelete: "set null" }),
  resolvido: boolean("resolvido").notNull().default(false),
  resolvidoEm: timestamp("resolvido_em"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* =========================================================
   RELATIONS
   ========================================================= */

export const empresaRelations = relations(empresa, ({ many, one }) => ({
  membros: many(membro),
  configuracao: one(configuracao),
  agentes: many(agente),
  tarefas: many(tarefa),
  runs: many(run),
  rotinas: many(rotina),
  fornecedores: many(cmvFornecedor),
  insumos: many(cmvInsumo),
  compras: many(cmvCompra),
  snapshots: many(cmvSnapshot),
  alertas: many(cmvAlerta),
}));

export const membroRelations = relations(membro, ({ one }) => ({
  empresa: one(empresa, { fields: [membro.empresaId], references: [empresa.id] }),
  usuario: one(usuario, { fields: [membro.usuarioId], references: [usuario.id] }),
}));

export const tarefaRelations = relations(tarefa, ({ one, many }) => ({
  empresa: one(empresa, { fields: [tarefa.empresaId], references: [empresa.id] }),
  agente: one(agente, { fields: [tarefa.agenteId], references: [agente.id] }),
  comentarios: many(comentario),
}));

export const runRelations = relations(run, ({ one }) => ({
  empresa: one(empresa, { fields: [run.empresaId], references: [empresa.id] }),
  agente: one(agente, { fields: [run.agenteId], references: [agente.id] }),
  tarefa: one(tarefa, { fields: [run.tarefaId], references: [tarefa.id] }),
}));

export const cmvCompraRelations = relations(cmvCompra, ({ one, many }) => ({
  empresa: one(empresa, { fields: [cmvCompra.empresaId], references: [empresa.id] }),
  fornecedor: one(cmvFornecedor, {
    fields: [cmvCompra.fornecedorId],
    references: [cmvFornecedor.id],
  }),
  itens: many(cmvCompraItem),
}));
