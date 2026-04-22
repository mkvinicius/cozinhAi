#!/usr/bin/env bash
set -e

echo "🍳 CozinhAI — Iniciando..."

# Verificar .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  .env criado a partir do .env.example — configure DATABASE_URL antes de continuar"
  exit 1
fi

# Instalar dependências se necessário
if [ ! -d node_modules ]; then
  echo "📦 Instalando dependências..."
  pnpm install
fi

# Iniciar servidor e UI em paralelo
cleanup() {
  kill 0
}
trap cleanup EXIT

echo "🚀 Iniciando servidor (porta 3100) e UI (porta 5173)..."
pnpm dev:server &
pnpm dev:ui &

wait
