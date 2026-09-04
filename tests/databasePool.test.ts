import { afterEach, expect, it, vi } from "vitest";
import { databasePoolConfig } from "@/lib/databasePool";

afterEach(() => vi.unstubAllEnvs());

it("bounds embedded database connections and releases idle clients", () => {
  vi.stubEnv("DATABASE_URL", "postgres://localhost:51214/template1");
  vi.stubEnv("PRISMA_DEV_DATABASE", "true");
  expect(databasePoolConfig()).toEqual({ connectionString: process.env.DATABASE_URL, max: 1, idleTimeoutMillis: 1 });
});

it("does not change pool defaults for real Postgres", () => {
  vi.stubEnv("DATABASE_URL", "postgres://localhost:5432/maintain_help");
  vi.stubEnv("PRISMA_DEV_DATABASE", "false");
  expect(databasePoolConfig()).toEqual({ connectionString: process.env.DATABASE_URL });
});
