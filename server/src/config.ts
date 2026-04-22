import { config as loadDotenv } from "dotenv";

loadDotenv();

export const config = {
  port: parseInt(process.env["PORT"] ?? "3100", 10),
  databaseUrl: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/cozinhai",
  jwtSecret: process.env["JWT_SECRET"] ?? "change-me-in-production",
  betterAuthSecret: process.env["BETTER_AUTH_SECRET"] ?? "change-me-in-production",
  betterAuthUrl: process.env["BETTER_AUTH_URL"] ?? "http://localhost:3100",
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  corsOrigins: (process.env["CORS_ORIGINS"] ?? "http://localhost:5173").split(","),
} as const;
