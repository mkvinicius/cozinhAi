import { Router, type RequestHandler } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@cozinhai/db";
import { empresa, membro, configuracao, agente } from "@cozinhai/db";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const onboardingSchema = z.object({
  /* step 1 — restaurante */
  slug: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen"),
  nome: z.string().min(2).max(100),
  tipo: z.enum(["restaurante", "buffet", "pizzaria", "hamburgueria", "marmitaria", "padaria", "bar", "outro"]),
  cidade: z.string().min(2).max(100),
  estado: z.string().length(2).default("SP"),
  /* step 2 — CMV */
  metaCmvBps: z.number().int().min(1000).max(8000),
  /* step 3 — LLM */
  llmProvedor: z.enum(["claude", "gemini", "openai"]),
  llmApiKey: z.string().min(10),
  llmModelo: z.string().optional(),
});

/* Default agents seeded for every new restaurant */
function defaultAgents(empresaId: string, provedor: "claude" | "gemini" | "openai", modelo?: string) {
  return [
    {
      empresaId,
      slug: "ceo",
      nome: "CEO Agente",
      papel: "Diretor executivo do restaurante. Analisa métricas de CMV, faturamento e desempenho geral. Gera recomendações estratégicas semanais e alerta sobre desvios críticos.",
      instrucoes: `Você é o CEO de um restaurante. Sua prioridade é manter o CMV dentro da meta definida pelo dono e garantir a saúde financeira do negócio.

Suas responsabilidades:
- Analisar o snapshot semanal de CMV e comparar com a meta
- Identificar os insumos com maior impacto no custo
- Recomendar ações concretas (negociação com fornecedor, revisão de cardápio, redução de desperdício)
- Comunicar resultados ao dono em linguagem simples e direta
- Escalar alertas urgentes imediatamente

Tom: direto, focado em números e ações. Nunca vague — sempre termine com uma recomendação.`,
      llmProvedor: provedor,
      llmModelo: modelo ?? null,
    },
    {
      empresaId,
      slug: "gestor-cmv",
      nome: "Gestor de CMV",
      papel: "Especialista em controle de custos. Monitora compras, preços de insumos e variações de CMV em tempo real.",
      instrucoes: `Você é o gestor de CMV do restaurante. Seu trabalho é monitorar cada centavo gasto com insumos.

Suas responsabilidades:
- Registrar e categorizar notas fiscais de compra
- Identificar insumos com alta de preço acima de 5%
- Calcular CMV real vs teórico por período
- Sugerir substituições de insumo quando o preço subir
- Monitorar o estoque mínimo dos itens críticos

Regra principal: CMV acima da meta por 3 dias consecutivos = alerta urgente para o CEO.`,
      llmProvedor: provedor,
      llmModelo: modelo ?? null,
    },
    {
      empresaId,
      slug: "comprador",
      nome: "Comprador",
      papel: "Responsável pelas cotações e compras de insumos. Compara preços entre fornecedores e registra notas fiscais.",
      instrucoes: `Você é o comprador do restaurante. Sua missão é comprar os insumos necessários pelo menor preço com a qualidade certa.

Suas responsabilidades:
- Cotar preços com múltiplos fornecedores antes de comprar
- Registrar todas as notas fiscais no sistema
- Alertar quando um fornecedor subir preço
- Manter histórico de preços por insumo
- Sugerir compras em volume quando houver oportunidade de desconto

Sempre justifique a escolha do fornecedor com base no preço e histórico.`,
      llmProvedor: provedor,
      llmModelo: modelo ?? null,
    },
  ];
}

const p = (v: string | string[] | undefined): string =>
  Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

export function onboardingRoutes(db: Db): RequestHandler {
  const router = Router();

  /* Check slug availability */
  router.get("/check-slug/:slug", requireAuth, async (req, res) => {
    const [found] = await db
      .select({ id: empresa.id })
      .from(empresa)
      .where(eq(empresa.slug, p(req.params["slug"])));
    res.json({ ok: true, data: { available: !found } });
  });

  /* Complete onboarding — creates empresa + config + default agents */
  router.post("/", requireAuth, validateBody(onboardingSchema), async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : null;
    if (!userId) { res.status(401).json({ ok: false, error: "Não autenticado" }); return; }

    const [existing] = await db
      .select({ id: empresa.id })
      .from(empresa)
      .where(eq(empresa.slug, req.body.slug));
    if (existing) { res.status(409).json({ ok: false, error: "Esse slug já está em uso" }); return; }

    /* 1. Create empresa */
    const [novaEmpresa] = await db
      .insert(empresa)
      .values({
        slug: req.body.slug,
        nome: req.body.nome,
        tipo: req.body.tipo,
        cidade: req.body.cidade,
        estado: req.body.estado,
        metaCmvBps: req.body.metaCmvBps,
      })
      .returning();

    if (!novaEmpresa) { res.status(500).json({ ok: false, error: "Erro ao criar empresa" }); return; }

    /* 2. Add owner membership */
    await db.insert(membro).values({
      empresaId: novaEmpresa.id,
      usuarioId: userId,
      role: "dono",
    });

    /* 3. Save LLM config */
    await db.insert(configuracao).values({
      empresaId: novaEmpresa.id,
      llmProvedor: req.body.llmProvedor,
      llmApiKey: req.body.llmApiKey,
      llmModelo: req.body.llmModelo ?? null,
    });

    /* 4. Seed default agents */
    await db.insert(agente).values(
      defaultAgents(novaEmpresa.id, req.body.llmProvedor, req.body.llmModelo),
    );

    res.status(201).json({ ok: true, data: { slug: novaEmpresa.slug, nome: novaEmpresa.nome } });
  });

  /* Get empresa config */
  router.get("/:slug/configuracao", requireAuth, async (req, res) => {
    const userId = req.actor.type === "user" ? req.actor.userId : null;
    if (!userId) { res.status(401).json({ ok: false, error: "Não autenticado" }); return; }

    const [emp] = await db.select().from(empresa).where(eq(empresa.slug, p(req.params["slug"])));
    if (!emp) { res.status(404).json({ ok: false, error: "Empresa não encontrada" }); return; }

    const [mem] = await db
      .select()
      .from(membro)
      .where(and(eq(membro.empresaId, emp.id), eq(membro.usuarioId, userId)));
    if (!mem) { res.status(403).json({ ok: false, error: "Acesso negado" }); return; }

    const [config] = await db
      .select({ llmProvedor: configuracao.llmProvedor, llmModelo: configuracao.llmModelo })
      .from(configuracao)
      .where(eq(configuracao.empresaId, emp.id));

    res.json({ ok: true, data: config ?? null });
  });

  return router as unknown as RequestHandler;
}
