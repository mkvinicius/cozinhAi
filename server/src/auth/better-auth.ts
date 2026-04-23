import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Db } from "@cozinhai/db";
import { usuario, sessao, conta, verificacao } from "@cozinhai/db";
import { config } from "../config.js";

export function createAuth(db: Db) {
  return betterAuth({
    baseURL: process.env["BETTER_AUTH_URL"] ?? process.env["BETTER_AUTH_BASE_URL"] ?? `http://localhost:${process.env["PORT"] ?? "3100"}`,
    secret: config.betterAuthSecret,
    trustedOrigins: config.corsOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: usuario,
        session: sessao,
        account: conta,
        verification: verificacao,
      },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
