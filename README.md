# CozinhAI

Sistema de gestão de CMV (Custo de Mercadoria Vendida) para restaurantes, com agentes de IA integrados.

## Funcionalidades

- **Dashboard de CMV** — painel em tempo real com status (ótimo / bom / atenção / crítico)
- **Registro de compras (NF)** — entrada de notas fiscais com itens, fornecedores e ingredientes
- **Cálculo automático de CMV** — recalculado a cada compra registrada
- **Alertas inteligentes** — notifica quando preços sobem >10% ou CMV ultrapassa a meta
- **Agentes de IA** — chat com Claude, Gemini e GPT-4o com memória de contexto
- **Multi-empresa** — suporte a múltiplos restaurantes por usuário
- **Onboarding guiado** — wizard de 5 passos para configurar o restaurante

## Instalação rápida na VPS

```bash
curl -fsSL https://raw.githubusercontent.com/mkvinicius/cozinhAi/main/install.sh | bash
```

> **Requisitos:** Ubuntu 24.04 LTS, Node.js 20+, PostgreSQL instalado e rodando, usuário root.

## Instalação manual

### 1. Pré-requisitos

```bash
# Node.js 20+
node --version

# pnpm
npm install -g pnpm

# PM2 (gerenciador de processos)
npm install -g pm2
```

### 2. Clonar o repositório

```bash
git clone https://github.com/mkvinicius/cozinhAi.git /root/cozinhai
cd /root/cozinhai
```

### 3. Configurar banco de dados PostgreSQL

```bash
# Criar usuário e banco
sudo -u postgres psql -c "CREATE USER cozinhai WITH PASSWORD 'sua_senha_segura';"
sudo -u postgres psql -c "CREATE DATABASE cozinhai OWNER cozinhai;"
```

### 4. Configurar variáveis de ambiente

```bash
cp .env.example .env
nano .env
```

Preencha pelo menos:
- `DATABASE_URL` — string de conexão PostgreSQL
- `BETTER_AUTH_SECRET` — gere com `openssl rand -base64 32`
- `BETTER_AUTH_URL` — URL pública do servidor (ex: `http://2.24.206.26:3100`)
- `CORS_ORIGINS` — mesma URL do servidor em produção
- Uma chave de API LLM: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` ou `OPENAI_API_KEY`

### 5. Instalar dependências e fazer build

```bash
pnpm install
pnpm build
```

### 6. Rodar migrations do banco

```bash
cd packages/db
pnpm push
cd ../..
```

### 7. Iniciar com PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # siga as instruções para iniciar no boot
```

### 8. Configurar firewall

```bash
ufw allow 22
ufw allow 3100
ufw enable
```

## Configuração

### Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | String de conexão PostgreSQL |
| `BETTER_AUTH_SECRET` | ✅ | Segredo para JWT (mínimo 32 chars) |
| `BETTER_AUTH_URL` | ✅ | URL pública do servidor |
| `PORT` | | Porta do servidor (padrão: 3100) |
| `NODE_ENV` | | `production` ou `development` |
| `CORS_ORIGINS` | | URLs permitidas para CORS |
| `ANTHROPIC_API_KEY` | ⚠️ | Chave da API Claude (Anthropic) |
| `GEMINI_API_KEY` | ⚠️ | Chave da API Gemini (Google) |
| `OPENAI_API_KEY` | ⚠️ | Chave da API GPT-4o (OpenAI) |

> ⚠️ Preencha pelo menos um provedor LLM para usar os agentes.

## Desenvolvimento local

```bash
# Instalar dependências
pnpm install

# Subir servidor + UI em modo dev (hot reload)
pnpm dev

# Ou separadamente:
pnpm dev:server   # http://localhost:3100
pnpm dev:ui       # http://localhost:5173
```

### Banco de dados local

```bash
# Aplicar schema no banco (sem migrations)
pnpm db:push

# Abrir Drizzle Studio (interface visual)
pnpm db:studio
```

## Estrutura do projeto

```
cozinhai/
├── packages/
│   ├── db/              # Schema Drizzle + cliente PostgreSQL
│   ├── shared/          # Tipos compartilhados
│   └── adapters/
│       ├── claude/      # Adapter Anthropic
│       ├── gemini/      # Adapter Google Gemini
│       └── openai/      # Adapter OpenAI
├── server/              # API Express 5 + SSE streaming
│   └── src/
│       ├── routes/      # Rotas: CMV, compras, agentes, tarefas...
│       └── services/    # cmv-calculator, cmv-alerts, run-executor
├── ui/                  # React 19 + Vite + TailwindCSS v4
│   └── src/
│       └── pages/       # Dashboard, CMV, Compras, Agentes...
├── install.sh           # Script de instalação para VPS
├── ecosystem.config.js  # Configuração PM2
└── .env.example         # Template de variáveis de ambiente
```

## Uso

### Primeiro acesso

1. Acesse `http://SEU_IP:3100`
2. Crie uma conta
3. Complete o onboarding (5 passos):
   - Nome e slug do restaurante
   - Meta de CMV (padrão: 32%)
   - Provedor LLM e chave de API
   - Agentes padrão criados automaticamente
4. Registre suas primeiras compras
5. Acompanhe o CMV no dashboard

### Comandos PM2

```bash
pm2 status              # Status do processo
pm2 logs cozinhai       # Ver logs em tempo real
pm2 restart cozinhai    # Reiniciar após mudanças no .env
pm2 stop cozinhai       # Parar o servidor
```

## Licença

MIT
