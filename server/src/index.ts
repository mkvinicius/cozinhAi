import { createDb } from "@cozinhai/db";
import { createApp } from "./app.js";
import { config } from "./config.js";

async function main() {
  const db = createDb(config.databaseUrl);
  const app = createApp(db);

  app.listen(config.port, () => {
    console.log(`CozinhAI rodando em http://localhost:${config.port}`);
    console.log(`Ambiente: ${config.nodeEnv}`);
  });
}

main().catch((err) => {
  console.error("Falha ao iniciar servidor:", err);
  process.exit(1);
});
