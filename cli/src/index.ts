#!/usr/bin/env node
import { config } from "dotenv";
config();

const [, , command, ...args] = process.argv;

const commands: Record<string, () => Promise<void>> = {
  async setup() {
    console.log("CozinhAI — Setup inicial");
    console.log("Configure DATABASE_URL no arquivo .env e execute:");
    console.log("  pnpm db:push    — criar tabelas no banco");
    console.log("  pnpm dev        — iniciar servidor + UI");
  },

  async help() {
    console.log(`
CozinhAI CLI v0.1.0

Comandos disponíveis:
  setup     Instruções de configuração inicial
  help      Exibe esta ajuda

Uso:
  pnpm --filter cli dev <comando>
  cozinhai <comando>     (após build)
`);
  },
};

async function main() {
  const cmd = command ?? "help";
  const handler = commands[cmd];
  if (!handler) {
    console.error(`Comando desconhecido: ${cmd}`);
    console.log("Execute 'cozinhai help' para ver os comandos disponíveis.");
    process.exit(1);
  }
  await handler();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
