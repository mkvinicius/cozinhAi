#!/bin/bash
# CozinhAI — Script de inicialização
# Uso: ./start.sh [dev|prod]

MODE="${1:-dev}"

if [ "$MODE" = "prod" ]; then
  echo "Iniciando em modo produção via PM2..."
  pm2 start ecosystem.config.js
  pm2 save
else
  echo "Iniciando em modo desenvolvimento..."
  if ! command -v concurrently &> /dev/null; then
    pnpm install
  fi
  pnpm dev
fi
