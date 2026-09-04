import type { PoolConfig } from "pg";

export function databasePoolConfig(): PoolConfig {
  return {
    connectionString: process.env.DATABASE_URL,
    // ponytail: the embedded Prisma dev server has a tiny shared connection budget.
    // Release idle clients promptly; real Postgres keeps pg's normal pool defaults.
    ...(process.env.PRISMA_DEV_DATABASE === "true" ? { max: 1, idleTimeoutMillis: 1 } : {}),
  };
}
