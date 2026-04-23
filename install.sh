#!/bin/bash
set -euo pipefail

# =============================================================
# CozinhAI — Script de instalação para Ubuntu 24.04 LTS
# Uso: bash install.sh
# =============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

REPO_URL="https://github.com/mkvinicius/cozinhAi.git"
INSTALL_DIR="/root/cozinhai"
APP_USER="root"
DB_USER="cozinhai"
DB_NAME="cozinhai"
PORT=3100

echo "=================================================="
echo "  CozinhAI — Instalação"
echo "=================================================="

# 1. Verificar Node.js >= 20
if ! command -v node &> /dev/null; then
  err "Node.js não encontrado. Instale Node.js 20+ antes de continuar."
fi
NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  err "Node.js 20+ é necessário. Versão atual: $(node --version)"
fi
log "Node.js $(node --version) encontrado"

# 2. Verificar PostgreSQL
if ! command -v psql &> /dev/null; then
  err "PostgreSQL não encontrado. Instale o PostgreSQL antes de continuar."
fi
if ! systemctl is-active --quiet postgresql; then
  warn "PostgreSQL não está rodando. Tentando iniciar..."
  systemctl start postgresql || err "Não foi possível iniciar o PostgreSQL."
fi
log "PostgreSQL rodando"

# 3. Instalar pnpm se necessário
if ! command -v pnpm &> /dev/null; then
  log "Instalando pnpm..."
  npm install -g pnpm@latest
fi
log "pnpm $(pnpm --version) encontrado"

# 4. Instalar PM2 se necessário
if ! command -v pm2 &> /dev/null; then
  log "Instalando PM2..."
  npm install -g pm2
fi
log "PM2 $(pm2 --version) encontrado"

# 5. Criar usuário e banco PostgreSQL
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
log "Criando usuário e banco PostgreSQL..."
sudo -u postgres psql -c "DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || warn "Banco '${DB_NAME}' já existe, continuando..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
log "Banco '${DB_NAME}' pronto"

# 6. Clonar ou atualizar repositório
if [ -d "$INSTALL_DIR" ]; then
  warn "Diretório $INSTALL_DIR já existe. Atualizando..."
  git -C "$INSTALL_DIR" pull origin main
else
  log "Clonando repositório em $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# 7. Gerar segredo de autenticação
AUTH_SECRET=$(openssl rand -base64 32)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

# 8. Criar arquivo .env
log "Criando arquivo .env..."
cat > .env << ENVEOF
DATABASE_URL=postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
PORT=${PORT}
NODE_ENV=production
TZ=America/Sao_Paulo
BETTER_AUTH_SECRET=${AUTH_SECRET}
BETTER_AUTH_URL=http://${SERVER_IP}:${PORT}
CORS_ORIGINS=http://${SERVER_IP}:${PORT}
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ENVEOF
log "Arquivo .env criado"

# 9. Instalar dependências
log "Instalando dependências (pnpm install)..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 10. Build completo
log "Fazendo build do projeto..."
pnpm build

# 11. Rodar migrations do banco
log "Rodando migrations do banco de dados..."
cd packages/db
DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}" pnpm push --force || warn "Migrations com avisos — verifique manualmente se necessário"
cd "$INSTALL_DIR"

# 12. Criar diretório de logs
mkdir -p /var/log/cozinhai

# 13. Configurar PM2
log "Configurando PM2..."
pm2 delete cozinhai 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash 2>/dev/null || warn "Configure o startup do PM2 manualmente"

# 14. Configurar UFW (firewall)
if command -v ufw &> /dev/null; then
  log "Configurando firewall UFW..."
  ufw allow 22/tcp
  ufw allow ${PORT}/tcp
  ufw --force enable
  log "UFW configurado: portas 22 e ${PORT} abertas"
else
  warn "UFW não encontrado — configure o firewall manualmente"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}  CozinhAI instalado com sucesso!${NC}"
echo "=================================================="
echo ""
echo "  URL de acesso:  http://${SERVER_IP}:${PORT}"
echo "  Banco de dados: ${DB_NAME}"
echo "  Usuário DB:     ${DB_USER}"
echo "  Senha DB:       ${DB_PASS}"
echo ""
echo "  IMPORTANTE: Configure pelo menos uma chave de API LLM no arquivo .env:"
echo "  nano ${INSTALL_DIR}/.env"
echo ""
echo "  Comandos úteis:"
echo "  pm2 status          — status do processo"
echo "  pm2 logs cozinhai   — ver logs"
echo "  pm2 restart cozinhai — reiniciar"
echo "=================================================="
