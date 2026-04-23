CREATE TYPE "public"."cmv_alerta_severidade" AS ENUM('info', 'atencao', 'critico', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."cmv_alerta_tipo" AS ENUM('preco_subiu', 'cmv_acima_meta', 'estoque_critico', 'fornecedor_irregular', 'desperdicio_alto');--> statement-breakpoint
CREATE TYPE "public"."insumo_unidade" AS ENUM('kg', 'g', 'litro', 'ml', 'unidade', 'porcao', 'caixa', 'pacote');--> statement-breakpoint
CREATE TYPE "public"."llm_provedor" AS ENUM('claude', 'gemini', 'openai', 'groq');--> statement-breakpoint
CREATE TYPE "public"."membro_role" AS ENUM('dono', 'gerente', 'cozinheiro', 'caixa', 'visualizador');--> statement-breakpoint
CREATE TYPE "public"."run_status" AS ENUM('iniciando', 'rodando', 'pausado', 'concluido', 'erro');--> statement-breakpoint
CREATE TYPE "public"."tarefa_prioridade" AS ENUM('urgente', 'alta', 'normal', 'baixa');--> statement-breakpoint
CREATE TYPE "public"."tarefa_status" AS ENUM('pendente', 'em_progresso', 'aguardando', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"papel" text NOT NULL,
	"instrucoes" text NOT NULL,
	"llm_provedor" "llm_provedor",
	"llm_modelo" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"metadados" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_alerta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "cmv_alerta_tipo" NOT NULL,
	"severidade" "cmv_alerta_severidade" NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text NOT NULL,
	"impacto_centavos" integer,
	"insumo_id" uuid,
	"fornecedor_id" uuid,
	"resolvido" boolean DEFAULT false NOT NULL,
	"resolvido_em" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"fornecedor_id" uuid,
	"numero_nf" text,
	"data_compra" timestamp NOT NULL,
	"total_centavos" integer NOT NULL,
	"observacoes" text,
	"registrado_por_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_compra_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"insumo_id" uuid,
	"descricao" text NOT NULL,
	"quantidade" integer NOT NULL,
	"unidade" "insumo_unidade" NOT NULL,
	"preco_centavos" integer NOT NULL,
	"total_centavos" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_faturamento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"mes" integer NOT NULL,
	"ano" integer NOT NULL,
	"faturamento_centavos" bigint NOT NULL,
	"total_clientes" integer,
	"observacoes" text,
	"registrado_por_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_fornecedor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cnpj" text,
	"contato" text,
	"email" text,
	"telefone" text,
	"observacoes" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_insumo" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"categoria" text,
	"unidade" "insumo_unidade" DEFAULT 'kg' NOT NULL,
	"preco_referencia_centavos" integer,
	"fornecedor_principal_id" uuid,
	"estoque_minimo" integer,
	"estoque_mili_unidades" integer DEFAULT 0 NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cmv_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"periodo" text NOT NULL,
	"data_inicio" timestamp NOT NULL,
	"data_fim" timestamp NOT NULL,
	"faturamento_centavos" bigint NOT NULL,
	"custo_mercadoria_centavos" bigint NOT NULL,
	"actual_cmv_bps" integer NOT NULL,
	"theoretical_cmv_bps" integer NOT NULL,
	"ticket_medio_centavos" integer,
	"total_vendas" integer,
	"observacoes" text,
	"gerado_por_agente_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comentario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarefa_id" uuid NOT NULL,
	"autor_id" text,
	"agente_id" uuid,
	"conteudo" text NOT NULL,
	"metadados" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "configuracao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"llm_provedor" "llm_provedor" DEFAULT 'claude' NOT NULL,
	"llm_api_key" text,
	"llm_modelo" text,
	"instagram_token" text,
	"telegram_token" text,
	"webhook_url" text,
	"extras" jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configuracao_empresa_id_unique" UNIQUE("empresa_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conta" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"usuario_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "empresa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"tipo" text DEFAULT 'restaurante' NOT NULL,
	"cnpj" text,
	"telefone" text,
	"endereco" text,
	"cidade" text,
	"estado" text DEFAULT 'SP',
	"logo_url" text,
	"meta_cmv_bps" integer DEFAULT 3200 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "empresa_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"usuario_id" text NOT NULL,
	"role" "membro_role" DEFAULT 'visualizador' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rotina" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"agente_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"cron" text NOT NULL,
	"instrucao" text NOT NULL,
	"ativa" boolean DEFAULT true NOT NULL,
	"ultima_execucao" timestamp,
	"proxima_execucao" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"agente_id" uuid NOT NULL,
	"tarefa_id" uuid,
	"status" "run_status" DEFAULT 'iniciando' NOT NULL,
	"entrada" text,
	"saida" text,
	"erro_msg" text,
	"tokens_usados" integer,
	"custo_centavos" integer,
	"iniciado_em" timestamp DEFAULT now() NOT NULL,
	"concluido_em" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessao" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"usuario_id" text NOT NULL,
	CONSTRAINT "sessao_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tarefa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descricao" text,
	"status" "tarefa_status" DEFAULT 'pendente' NOT NULL,
	"prioridade" "tarefa_prioridade" DEFAULT 'normal' NOT NULL,
	"agente_id" uuid,
	"criado_por_id" text,
	"atribuido_para_id" text,
	"prazo" timestamp,
	"contexto" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuario" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"email_verificado" boolean DEFAULT false NOT NULL,
	"imagem_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuario_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verificacao" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agente" ADD CONSTRAINT "agente_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_alerta" ADD CONSTRAINT "cmv_alerta_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_alerta" ADD CONSTRAINT "cmv_alerta_insumo_id_cmv_insumo_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."cmv_insumo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_alerta" ADD CONSTRAINT "cmv_alerta_fornecedor_id_cmv_fornecedor_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."cmv_fornecedor"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_compra" ADD CONSTRAINT "cmv_compra_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_compra" ADD CONSTRAINT "cmv_compra_fornecedor_id_cmv_fornecedor_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."cmv_fornecedor"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_compra" ADD CONSTRAINT "cmv_compra_registrado_por_id_usuario_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_compra_item" ADD CONSTRAINT "cmv_compra_item_compra_id_cmv_compra_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."cmv_compra"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_compra_item" ADD CONSTRAINT "cmv_compra_item_insumo_id_cmv_insumo_id_fk" FOREIGN KEY ("insumo_id") REFERENCES "public"."cmv_insumo"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_faturamento" ADD CONSTRAINT "cmv_faturamento_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_faturamento" ADD CONSTRAINT "cmv_faturamento_registrado_por_id_usuario_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_fornecedor" ADD CONSTRAINT "cmv_fornecedor_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_insumo" ADD CONSTRAINT "cmv_insumo_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_insumo" ADD CONSTRAINT "cmv_insumo_fornecedor_principal_id_cmv_fornecedor_id_fk" FOREIGN KEY ("fornecedor_principal_id") REFERENCES "public"."cmv_fornecedor"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_snapshot" ADD CONSTRAINT "cmv_snapshot_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cmv_snapshot" ADD CONSTRAINT "cmv_snapshot_gerado_por_agente_id_agente_id_fk" FOREIGN KEY ("gerado_por_agente_id") REFERENCES "public"."agente"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comentario" ADD CONSTRAINT "comentario_tarefa_id_tarefa_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comentario" ADD CONSTRAINT "comentario_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comentario" ADD CONSTRAINT "comentario_agente_id_agente_id_fk" FOREIGN KEY ("agente_id") REFERENCES "public"."agente"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "configuracao" ADD CONSTRAINT "configuracao_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conta" ADD CONSTRAINT "conta_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membro" ADD CONSTRAINT "membro_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membro" ADD CONSTRAINT "membro_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rotina" ADD CONSTRAINT "rotina_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rotina" ADD CONSTRAINT "rotina_agente_id_agente_id_fk" FOREIGN KEY ("agente_id") REFERENCES "public"."agente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run" ADD CONSTRAINT "run_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run" ADD CONSTRAINT "run_agente_id_agente_id_fk" FOREIGN KEY ("agente_id") REFERENCES "public"."agente"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "run" ADD CONSTRAINT "run_tarefa_id_tarefa_id_fk" FOREIGN KEY ("tarefa_id") REFERENCES "public"."tarefa"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessao" ADD CONSTRAINT "sessao_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_empresa_id_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresa"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_agente_id_agente_id_fk" FOREIGN KEY ("agente_id") REFERENCES "public"."agente"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_criado_por_id_usuario_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tarefa" ADD CONSTRAINT "tarefa_atribuido_para_id_usuario_id_fk" FOREIGN KEY ("atribuido_para_id") REFERENCES "public"."usuario"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
